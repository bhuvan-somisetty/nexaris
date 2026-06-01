import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, OrderStatus, FulfillmentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    role: Role,
    query: { page?: number; limit?: number; status?: OrderStatus },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    // RBAC Scope Boundaries
    if (role === Role.CUSTOMER) {
      where.customerId = userId;
    } else if (role === Role.SELLER) {
      // Sellers can query orders containing their listings
      where.items = {
        some: { sellerId: userId },
      };
    }
    // Admin role has empty filters (sees all)

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // For sellers, filter item arrays so they don't view other vendor items in summaries
    const sanitizedOrders = orders.map((o) => {
      const copy = { ...o };
      if (role === Role.SELLER) {
        copy.items = copy.items.filter((item) => item.sellerId === userId);
      }
      return copy;
    });

    return {
      orders: sanitizedOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: true,
        timeline: {
          orderBy: { createdAt: 'asc' },
        },
        customer: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify Access Permissions
    if (role === Role.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order.');
    }

    if (role === Role.SELLER) {
      const hasSellerItems = order.items.some((item) => item.sellerId === userId);
      if (!hasSellerItems) {
        throw new ForbiddenException('You do not have permission to view this order.');
      }
      // Restrict seller to view only their own items
      order.items = order.items.filter((item) => item.sellerId === userId);
    }

    return order;
  }

  async updateFulfillmentStatus(
    userId: string,
    role: Role,
    orderItemId: string,
    status: FulfillmentStatus,
    notes?: string,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    // Verify Ownership
    if (role === Role.SELLER && item.sellerId !== userId) {
      throw new ForbiddenException('You do not have permission to update fulfillment for this item.');
    }

    // Perform status updates
    await this.prisma.$transaction(async (tx) => {
      // 1. Update OrderItem fulfillmentStatus
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { fulfillmentStatus: status },
      });

      // 2. Fetch all items in order to evaluate parent Order status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      let nextOrderStatus = item.order.status;

      const statuses = allItems.map((ai) => ai.fulfillmentStatus);
      const allDelivered = statuses.every((s) => s === FulfillmentStatus.DELIVERED);
      const allShipped = statuses.every((s) => s === FulfillmentStatus.SHIPPED || s === FulfillmentStatus.DELIVERED);
      const allCancelled = statuses.every((s) => s === FulfillmentStatus.CANCELLED);
      const anyProcessing = statuses.some((s) => s === FulfillmentStatus.PROCESSING || s === FulfillmentStatus.SHIPPED);

      if (allDelivered) {
        nextOrderStatus = OrderStatus.DELIVERED;
      } else if (allShipped) {
        nextOrderStatus = OrderStatus.SHIPPED;
      } else if (allCancelled) {
        nextOrderStatus = OrderStatus.CANCELLED;
      } else if (anyProcessing) {
        nextOrderStatus = OrderStatus.PROCESSING;
      }

      // If main status transitions, update and log timeline entry
      if (nextOrderStatus !== item.order.status) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { status: nextOrderStatus },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: item.orderId,
            status: nextOrderStatus,
            notes: notes || `Order overall status transitioned to ${nextOrderStatus}.`,
            actorId: userId,
          },
        });
      } else {
        // Just log the individual item fulfillment update in timeline
        await tx.orderTimeline.create({
          data: {
            orderId: item.orderId,
            status: nextOrderStatus,
            notes: `Item "${item.productName}" updated to ${status} by seller.`,
            actorId: userId,
          },
        });
      }
    });

    return this.findOne(item.orderId, userId, role);
  }

  async cancelOrder(userId: string, role: Role, orderId: string, notes?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Role Checks & Cancellations Eligibility
    if (role === Role.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new ForbiddenException('You cannot cancel this order.');
      }
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException('Cannot cancel order after it has entered processing or shipping.');
      }
    } else if (role !== Role.ADMIN) {
      throw new ForbiddenException('Only customers and admins can cancel orders.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled.');
    }

    // Run inventory rollback transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Rollback stock counts
      for (const item of order.items) {
        if (item.productId) {
          if (item.variantId) {
            // Check variant inventory exists
            const variantInv = await tx.inventory.findFirst({
              where: { variantId: item.variantId },
            });
            if (variantInv) {
              await tx.inventory.update({
                where: { id: variantInv.id },
                data: { quantity: { increment: item.quantity } },
              });
            }
          } else {
            // Check product inventory exists
            const productInv = await tx.inventory.findFirst({
              where: { productId: item.productId },
            });
            if (productInv) {
              await tx.inventory.update({
                where: { id: productInv.id },
                data: { quantity: { increment: item.quantity } },
              });
            }
          }
        }
      }

      // 2. Set statuses
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderItem.updateMany({
        where: { orderId },
        data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
      });

      // 3. Create Timeline log
      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          notes: notes || `Order cancelled by ${role.toLowerCase()}. Stock returned to inventory.`,
          actorId: userId,
        },
      });

      // Log Audit Trail
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CANCEL',
          entity: 'ORDER',
          entityId: orderId,
          oldValue: { status: order.status },
          newValue: { status: OrderStatus.CANCELLED },
        },
      });
    });

    return this.findOne(orderId, userId, role);
  }

  async adminOverrideStatus(userId: string, orderId: string, status: OrderStatus, notes?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      // If marked cancelled or refunded, optionally revert stock if order is not already cancelled
      if ((status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) && order.status !== OrderStatus.CANCELLED) {
        // Rollback stock (similar to cancellation helper)
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          if (item.productId) {
            if (item.variantId) {
              const variantInv = await tx.inventory.findFirst({ where: { variantId: item.variantId } });
              if (variantInv) {
                await tx.inventory.update({ where: { id: variantInv.id }, data: { quantity: { increment: item.quantity } } });
              }
            } else {
              const productInv = await tx.inventory.findFirst({ where: { productId: item.productId } });
              if (productInv) {
                await tx.inventory.update({ where: { id: productInv.id }, data: { quantity: { increment: item.quantity } } });
              }
            }
          }
        }

        // Set all items as CANCELLED
        await tx.orderItem.updateMany({
          where: { orderId },
          data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
        });
      }

      await tx.orderTimeline.create({
        data: {
          orderId,
          status,
          notes: notes || `Admin overrode order status to ${status}.`,
          actorId: userId,
        },
      });
    });

    return this.findOne(orderId, userId, Role.ADMIN);
  }
}
