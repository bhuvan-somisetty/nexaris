import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, FulfillmentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService) {}

  async processCheckout(userId: string, data: { addressId?: string; newAddress?: any }) {
    // 1. Fetch Cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                inventory: true,
              },
            },
            variant: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty.');
    }

    // 2. Validate Inventory
    for (const item of cart.items) {
      const stock = item.variantId
        ? (item.variant?.inventory?.quantity ?? 0)
        : (item.product?.inventory?.quantity ?? 0);

      if (stock <= 0) {
        throw new BadRequestException(`Product "${item.product.name}" is out of stock.`);
      }

      if (stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${stock}, Requested: ${item.quantity}.`
        );
      }
    }

    // 3. Resolve Shipping Address
    let addressData: any = null;

    if (data.addressId) {
      const savedAddress = await this.prisma.address.findUnique({
        where: { id: data.addressId },
      });
      if (!savedAddress || savedAddress.userId !== userId) {
        throw new NotFoundException('Selected shipping address not found.');
      }
      addressData = {
        firstName: savedAddress.firstName,
        lastName: savedAddress.lastName,
        street1: savedAddress.street1,
        street2: savedAddress.street2,
        city: savedAddress.city,
        state: savedAddress.state,
        postalCode: savedAddress.postalCode,
        country: savedAddress.country,
        phone: savedAddress.phone,
      };
    } else if (data.newAddress) {
      const addr = data.newAddress;
      if (!addr.firstName || !addr.lastName || !addr.street1 || !addr.city || !addr.state || !addr.postalCode || !addr.country) {
        throw new BadRequestException('Invalid address payload. Missing required fields.');
      }
      // Save it to user's address book for future checkout uses
      const savedAddr = await this.prisma.address.create({
        data: {
          userId,
          firstName: addr.firstName,
          lastName: addr.lastName,
          street1: addr.street1,
          street2: addr.street2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          phone: addr.phone || null,
        },
      });
      addressData = {
        firstName: savedAddr.firstName,
        lastName: savedAddr.lastName,
        street1: savedAddr.street1,
        street2: savedAddr.street2,
        city: savedAddr.city,
        state: savedAddr.state,
        postalCode: savedAddr.postalCode,
        country: savedAddr.country,
        phone: savedAddr.phone,
      };
    } else {
      throw new BadRequestException('A shipping address is required for checkout.');
    }

    // 4. Calculate Totals
    const subtotal = cart.items.reduce((acc, item) => {
      const price = item.variant?.price
        ? parseFloat(item.variant.price.toString())
        : parseFloat(item.product.price.toString());
      return acc + price * item.quantity;
    }, 0);

    const tax = subtotal * 0.18; // 18% GST
    const shipping = subtotal > 999 ? 0 : 99; // ₹99 shipping, free above ₹999
    const total = subtotal + tax + shipping;

    // 5. Execute transaction
    return this.prisma.$transaction(async (tx) => {
      // Re-verify inventory inside transaction to prevent race conditions
      for (const item of cart.items) {
        if (item.variantId) {
          const variantInv = await tx.inventory.findUnique({
            where: { variantId: item.variantId },
          });
          if (!variantInv || variantInv.quantity < item.quantity) {
            throw new BadRequestException(`Stock changed. Insufficient stock for ${item.product.name}.`);
          }
          // Deduct quantity
          await tx.inventory.update({
            where: { id: variantInv.id },
            data: { quantity: { decrement: item.quantity } },
          });
        } else {
          const productInv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });
          if (!productInv || productInv.quantity < item.quantity) {
            throw new BadRequestException(`Stock changed. Insufficient stock for ${item.product.name}.`);
          }
          // Deduct quantity
          await tx.inventory.update({
            where: { id: productInv.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          customerId: userId,
          status: OrderStatus.CONFIRMED, // Place straight to CONFIRMED since payment integration is mock
          subtotal,
          tax,
          shipping,
          total,
        },
      });

      // Create OrderAddress snapshot
      await tx.orderAddress.create({
        data: {
          orderId: order.id,
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          street1: addressData.street1,
          street2: addressData.street2,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
          phone: addressData.phone || null,
        },
      });

      // Create Order Items Snapshots
      for (const item of cart.items) {
        const itemPrice = item.variant?.price
          ? parseFloat(item.variant.price.toString())
          : parseFloat(item.product.price.toString());

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            price: itemPrice,
            productName: item.product.name,
            productSlug: item.product.slug,
            productImage: item.product.images?.[0]?.url || null,
            variantName: item.variant?.name || null,
            variantSku: item.variant?.sku || item.product.sku || null,
            sellerId: item.product.sellerId,
            fulfillmentStatus: FulfillmentStatus.PENDING, // Default seller-level fulfillment
          },
        });
      }

      // Create Timeline Log
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CONFIRMED,
          notes: 'Order checked out and confirmed successfully.',
          actorId: userId,
        },
      });

      // Clear Shopping Cart Items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Log Audit Trail
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CHECKOUT',
          entity: 'ORDER',
          entityId: order.id,
          newValue: { total, subtotal, tax, shipping },
        },
      });

      return order;
    });
  }
}
