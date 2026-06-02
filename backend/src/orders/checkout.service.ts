import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  NotificationType,
  DiscountType,
  UserActivityType,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsService } from '../promotions/promotions.service';

const PAYMENT_EXPIRY_MINUTES = 15;

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private promotionsService: PromotionsService,
  ) {}

  async processCheckout(
    userId: string,
    data: { addressId?: string; newAddress?: any; couponCodes?: string[] },
  ) {
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
        throw new BadRequestException(
          `Product "${item.product.name}" is out of stock.`,
        );
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
      if (
        !addr.firstName ||
        !addr.lastName ||
        !addr.street1 ||
        !addr.city ||
        !addr.state ||
        !addr.postalCode ||
        !addr.country
      ) {
        throw new BadRequestException(
          'Invalid address payload. Missing required fields.',
        );
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
      throw new BadRequestException(
        'A shipping address is required for checkout.',
      );
    }

    // 4. Calculate Totals and Apply Promotions
    const subtotal = cart.items.reduce((acc, item) => {
      const price = item.variant?.price
        ? parseFloat(item.variant.price.toString())
        : parseFloat(item.product.price.toString());
      return acc + price * item.quantity;
    }, 0);

    let discount = 0;
    let freeShipping = false;
    let appliedCoupons: string[] = [];

    if (data.couponCodes && data.couponCodes.length > 0) {
      const validation = await this.promotionsService.validateDiscount(
        userId,
        data.couponCodes,
        subtotal,
      );
      discount = validation.discountAmount;
      freeShipping = validation.freeShipping;
      appliedCoupons = validation.couponsApplied;
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Number((discountedSubtotal * 0.18).toFixed(2)); // 18% GST on discounted subtotal
    let shipping = subtotal > 999 ? 0 : 99; // ₹99 standard, free above ₹999
    if (freeShipping) {
      shipping = 0;
    }
    const total = Number((discountedSubtotal + tax + shipping).toFixed(2));

    // 5. Execute Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // ── Re-validate + RESERVE inventory (not deduct) ──────────────────────
      for (const item of cart.items) {
        if (item.variantId) {
          const inv = await tx.inventory.findUnique({
            where: { variantId: item.variantId },
          });
          const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);
          if (!inv || available < item.quantity) {
            throw new BadRequestException(
              `Stock changed. Insufficient stock for "${item.product.name}".`,
            );
          }
          await tx.inventory.update({
            where: { id: inv.id },
            data: { reserved: { increment: item.quantity } },
          });
        } else {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });
          const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);
          if (!inv || available < item.quantity) {
            throw new BadRequestException(
              `Stock changed. Insufficient stock for "${item.product.name}".`,
            );
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
          discount,
          couponCode: appliedCoupons.join(','),
        },
      });

      // ── Decrement coupon availability atomically & record redemptions ────
      for (const code of appliedCoupons) {
        const result = await tx.coupon.updateMany({
          where: {
            code,
            isActive: true,
            endDate: { gte: new Date() },
            OR: [
              { usageLimit: null },
              { usedCount: { lt: this.prisma.coupon.fields.usageLimit } },
            ],
          },
          data: {
            usedCount: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new BadRequestException(
            `Failed to apply coupon: ${code}. Limit reached or expired.`,
          );
        }

        const coupon = await tx.coupon.findUnique({
          where: { code },
        });

        if (coupon) {
          let discountAppliedForThisCoupon = 0;
          if (coupon.discountType === DiscountType.FREE_SHIPPING) {
            discountAppliedForThisCoupon = 99; // value of standard shipping saved
          } else if (coupon.discountType === DiscountType.PERCENTAGE) {
            let valueDeducted = (subtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscountAmount !== null) {
              valueDeducted = Math.min(
                valueDeducted,
                Number(coupon.maxDiscountAmount),
              );
            }
            discountAppliedForThisCoupon = valueDeducted;
          } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
            discountAppliedForThisCoupon = Math.min(
              subtotal,
              Number(coupon.value),
            );
          }

          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              customerId: userId,
              orderId: order.id,
              discountApplied: discountAppliedForThisCoupon,
            },
          });
        }
      }

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
      const expiresAt = new Date(
        Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000,
      );

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

    this.eventEmitter.emit('notification.send', {
      userId,
      type: NotificationType.ORDER_CREATED,
      metadata: {
        orderId: result.order.id,
        amount: result.order.total.toString(),
      },
    });

    // Log purchase activity for recommendations engine
    await this.promotionsService
      .trackUserActivity(userId, UserActivityType.PURCHASE, undefined, {
        orderId: result.order.id,
        total: result.order.total,
      })
      .catch((err) => console.error('Failed to log checkout activity:', err));

    return result;
  }
}
