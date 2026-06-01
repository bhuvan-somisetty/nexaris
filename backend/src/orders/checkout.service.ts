import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const PAYMENT_EXPIRY_MINUTES = 15;

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

    // 2. Validate Inventory (pre-check; authoritative re-check inside transaction)
    for (const item of cart.items) {
      const inv = item.variantId
        ? item.variant?.inventory
        : item.product?.inventory;

      const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);

      if (available <= 0) {
        throw new BadRequestException(`Product "${item.product.name}" is out of stock.`);
      }
      if (available < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${available}, Requested: ${item.quantity}.`,
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
      addressData = { ...savedAddress };
    } else if (data.newAddress) {
      const addr = data.newAddress;
      if (!addr.firstName || !addr.lastName || !addr.street1 || !addr.city || !addr.state || !addr.postalCode || !addr.country) {
        throw new BadRequestException('Invalid address payload. Missing required fields.');
      }
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
      addressData = { ...savedAddr };
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

    const tax = subtotal * 0.18;            // 18% GST
    const shipping = subtotal > 999 ? 0 : 99; // ₹99 standard, free above ₹999
    const total = subtotal + tax + shipping;

    // 5. Execute Transaction
    return this.prisma.$transaction(async (tx) => {
      // ── Re-validate + RESERVE inventory (not deduct) ──────────────────────
      for (const item of cart.items) {
        if (item.variantId) {
          const inv = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
          const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);
          if (!inv || available < item.quantity) {
            throw new BadRequestException(`Stock changed. Insufficient stock for "${item.product.name}".`);
          }
          await tx.inventory.update({
            where: { id: inv.id },
            data: { reserved: { increment: item.quantity } },
          });
        } else {
          const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
          const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);
          if (!inv || available < item.quantity) {
            throw new BadRequestException(`Stock changed. Insufficient stock for "${item.product.name}".`);
          }
          await tx.inventory.update({
            where: { id: inv.id },
            data: { reserved: { increment: item.quantity } },
          });
        }
      }

      // ── Create Order in PENDING state ────────────────────────────────────
      const order = await tx.order.create({
        data: {
          customerId: userId,
          status: OrderStatus.PENDING,
          subtotal,
          tax,
          shipping,
          total,
        },
      });

      // ── Create OrderAddress snapshot ─────────────────────────────────────
      await tx.orderAddress.create({
        data: {
          orderId: order.id,
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          street1: addressData.street1,
          street2: addressData.street2 || null,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
          phone: addressData.phone || null,
        },
      });

      // ── Create OrderItem snapshots ───────────────────────────────────────
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
          },
        });
      }

      // ── Create Payment record (PENDING) ──────────────────────────────────
      const idempotencyKey = uuidv4();
      const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.PENDING,
          amount: total,
          currency: 'INR',
          idempotencyKey,
          providerOrderId: `mock_order_${idempotencyKey}`,
          expiresAt,
        },
      });

      // ── Timeline: order placed ────────────────────────────────────────────
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PENDING,
          notes: 'Order placed. Awaiting payment confirmation.',
          actorId: userId,
        },
      });

      // ── Clear cart ────────────────────────────────────────────────────────
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // ── Audit log ─────────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CHECKOUT',
          entity: 'ORDER',
          entityId: order.id,
          newValue: { total, subtotal, tax, shipping, paymentId: payment.id },
        },
      });

      return { order, payment };
    });
  }
}
