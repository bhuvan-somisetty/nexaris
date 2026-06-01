import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
  Role,
  NotificationType,
} from '@prisma/client';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

const PAYMENT_EXPIRY_MINUTES = 15;
const ACTIVE_PROVIDER = PaymentProvider.MOCK;

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private providerFactory: PaymentProviderFactory,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Initiate Payment ──────────────────────────────────────────────────────

  async initiatePayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.customerId !== userId)
      throw new ForbiddenException('You do not own this order.');
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED)
      throw new BadRequestException(`Order is not in a payable state (current: ${order.status}).`);

    // If payment already exists and is still pending (not expired), return it
    if (order.payment) {
      const existing = order.payment;
      if (existing.status === PaymentStatus.SUCCESS)
        throw new ConflictException('This order has already been paid.');
      if (
        existing.status === PaymentStatus.PENDING &&
        existing.expiresAt > new Date()
      ) {
        return existing;
      }
    }

    const provider = this.providerFactory.getProvider(ACTIVE_PROVIDER);
    const idempotencyKey = uuidv4();
    const amount = parseFloat(order.total.toString());

    const providerResult = await provider.createOrder(amount, 'INR', idempotencyKey);

    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);

    // Upsert payment — handles both fresh create and expired payment refresh
    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        provider: ACTIVE_PROVIDER,
        status: PaymentStatus.PENDING,
        amount,
        currency: 'INR',
        idempotencyKey,
        providerOrderId: providerResult.providerOrderId,
        expiresAt,
      },
      update: {
        status: PaymentStatus.PENDING,
        idempotencyKey,
        providerOrderId: providerResult.providerOrderId,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_INITIATED',
        entity: 'PAYMENT',
        entityId: payment.id,
        newValue: { orderId, amount, provider: ACTIVE_PROVIDER },
      },
    });

    return payment;
  }

  // ─── Verify Payment ─────────────────────────────────────────────────────────

  async verifyPayment(
    paymentId: string,
    userId: string,
    payload: {
      providerPaymentId: string;
      providerSignature?: string;
      paymentMethod?: PaymentMethod;
      simulateFailure?: boolean;
    },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true, attempts: true },
    });

    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.order.customerId !== userId)
      throw new ForbiddenException('You do not own this payment.');

    // Idempotency: already verified
    if (payment.status === PaymentStatus.SUCCESS) {
      return { payment, message: 'Payment already verified (idempotent response).' };
    }

    if (payment.status === PaymentStatus.PENDING && payment.expiresAt < new Date()) {
      throw new BadRequestException(
        'Payment window has expired. Please retry the payment to get a new payment session.',
      );
    }

    const attemptNumber = payment.attempts.length + 1;
    const provider = this.providerFactory.getProvider(payment.provider);

    // Allow failure simulation via the special paymentId sentinel
    const effectivePaymentId = payload.simulateFailure
      ? 'mock_fail'
      : payload.providerPaymentId;

    await this.prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        attemptNumber,
        status: PaymentStatus.PROCESSING,
        providerRef: effectivePaymentId,
      },
    });

    const result = await provider.verifyPayment(
      payment.providerOrderId || '',
      effectivePaymentId,
      payload.providerSignature,
    );

    if (result.success) {
      // ── SUCCESS PATH ──────────────────────────────────────────────────────
      await this.prisma.$transaction(async (tx) => {
        // 1. Update payment record
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            providerPaymentId: result.providerPaymentId,
            providerSignature: result.providerSignature,
            paymentMethod: payload.paymentMethod || PaymentMethod.MOCK,
          },
        });

        // 2. Update latest attempt
        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id, status: PaymentStatus.PROCESSING },
          data: { status: PaymentStatus.SUCCESS, providerRef: result.providerPaymentId },
        });

        // 3. Convert reservation → actual deduction
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: payment.orderId },
        });

        for (const item of orderItems) {
          if (item.variantId) {
            await tx.inventory.updateMany({
              where: { variantId: item.variantId },
              data: {
                quantity: { decrement: item.quantity },
                reserved: { decrement: item.quantity },
              },
            });
          } else if (item.productId) {
            await tx.inventory.updateMany({
              where: { productId: item.productId },
              data: {
                quantity: { decrement: item.quantity },
                reserved: { decrement: item.quantity },
              },
            });
          }
        }

        // 4. Confirm order
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.CONFIRMED },
        });

        // 5. Timeline entry
        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            status: OrderStatus.CONFIRMED,
            notes: `Payment verified successfully. Provider ref: ${result.providerPaymentId}`,
            actorId: userId,
          },
        });

        // 6. Audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'PAYMENT_SUCCESS',
            entity: 'PAYMENT',
            entityId: payment.id,
            newValue: { providerPaymentId: result.providerPaymentId, attemptNumber },
          },
        });
      });

      this.eventEmitter.emit('notification.send', {
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        metadata: {
          orderId: payment.orderId,
          amount: payment.amount.toString(),
        },
      });
    } else {
      // ── FAILURE PATH ──────────────────────────────────────────────────────
      await this.prisma.$transaction(async (tx) => {
        // 1. Update attempt with failure reason
        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id, status: PaymentStatus.PROCESSING },
          data: { status: PaymentStatus.FAILED, failureReason: result.failureReason },
        });

        // 2. Mark payment as failed
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        // 3. Set order to PAYMENT_FAILED
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        // 4. Timeline entry
        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            status: OrderStatus.PAYMENT_FAILED,
            notes: `Payment failed. Reason: ${result.failureReason || 'Unknown'}`,
            actorId: userId,
          },
        });

        // 5. Audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'PAYMENT_FAILED',
            entity: 'PAYMENT',
            entityId: payment.id,
            newValue: { failureReason: result.failureReason, attemptNumber },
          },
        });
      });

      this.eventEmitter.emit('notification.send', {
        userId,
        type: NotificationType.PAYMENT_FAILED,
        metadata: {
          orderId: payment.orderId,
          amount: payment.amount.toString(),
        },
      });
    }

    return this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    });
  }

  // ─── Retry Payment ──────────────────────────────────────────────────────────

  async retryPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.order.customerId !== userId)
      throw new ForbiddenException('You do not own this payment.');
    if (payment.status === PaymentStatus.SUCCESS)
      throw new ConflictException('Payment has already been completed successfully.');

    const provider = this.providerFactory.getProvider(payment.provider);
    const newIdempotencyKey = uuidv4();
    const amount = parseFloat(payment.amount.toString());

    const providerResult = await provider.createOrder(amount, payment.currency, newIdempotencyKey);
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PENDING,
        idempotencyKey: newIdempotencyKey,
        providerOrderId: providerResult.providerOrderId,
        expiresAt,
      },
    });

    // Reset order to PENDING for retry
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PENDING },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_RETRY_INITIATED',
        entity: 'PAYMENT',
        entityId: paymentId,
        newValue: { newIdempotencyKey, expiresAt },
      },
    });

    return updatedPayment;
  }

  // ─── Initiate Refund (Admin) ────────────────────────────────────────────────

  async initiateRefund(
    paymentId: string,
    adminId: string,
    amount: number,
    reason?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== PaymentStatus.SUCCESS)
      throw new BadRequestException('Only successful payments can be refunded.');

    const refundAmount = amount ?? parseFloat(payment.amount.toString());
    if (refundAmount > parseFloat(payment.amount.toString()))
      throw new BadRequestException('Refund amount cannot exceed original payment amount.');

    const provider = this.providerFactory.getProvider(payment.provider);
    const result = await provider.initiateRefund(
      payment.providerPaymentId || '',
      refundAmount,
      reason,
    );

    const isFullRefund = refundAmount >= parseFloat(payment.amount.toString());

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          reason,
          status: result.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
          providerRefundId: result.providerRefundId,
          initiatedById: adminId,
        },
      });

      if (result.success) {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: isFullRefund
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.REFUNDED },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            status: OrderStatus.REFUNDED,
            notes: `Refund of ₹${refundAmount} initiated by admin. Ref: ${result.providerRefundId}`,
            actorId: adminId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'PAYMENT_REFUNDED',
            entity: 'PAYMENT',
            entityId: paymentId,
            newValue: { refundAmount, providerRefundId: result.providerRefundId },
          },
        });
      }
    });

    if (result.success) {
      this.eventEmitter.emit('notification.send', {
        userId: payment.order.customerId,
        type: NotificationType.REFUND_CREATED,
        metadata: {
          orderId: payment.orderId,
          amount: refundAmount.toString(),
          reason: reason || 'Not specified',
        },
      });
    }

    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });
  }

  // ─── Get Payment by Order ───────────────────────────────────────────────────

  async getPaymentByOrder(orderId: string, userId: string, role: Role) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        attempts: { orderBy: { attemptNumber: 'asc' } },
        refunds: true,
        order: { select: { customerId: true } },
      },
    });

    if (!payment) throw new NotFoundException('No payment found for this order.');

    if (role === Role.CUSTOMER && payment.order.customerId !== userId)
      throw new ForbiddenException('You do not have permission to view this payment.');

    return payment;
  }

  // ─── Get Payment History ────────────────────────────────────────────────────

  async getPaymentHistory(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      select: { id: true },
    });

    const orderIds = orders.map((o) => o.id);

    return this.prisma.payment.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        attempts: { orderBy: { attemptNumber: 'asc' } },
        refunds: true,
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            items: { select: { productName: true, productImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
