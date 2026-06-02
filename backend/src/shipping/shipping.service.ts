import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiprocketAdapter } from './adapters/shiprocket.adapter';
import { DelhiveryAdapter } from './adapters/delhivery.adapter';
import { BlueDartAdapter } from './adapters/bluedart.adapter';
import {
  ShippingProvider,
  CreateShipmentDto,
} from './interfaces/shipping-provider.interface';
import {
  ShipmentStatus,
  ReturnRequestStatus,
  ReturnReason,
  WebhookStatus,
  NotificationType,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly providerRegistry: Map<string, ShippingProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shiprocket: ShiprocketAdapter,
    private readonly delhivery: DelhiveryAdapter,
    private readonly bluedart: BlueDartAdapter,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.providerRegistry = new Map<string, ShippingProvider>([
      ['SHIPROCKET', this.shiprocket],
      ['DELHIVERY', this.delhivery],
      ['BLUEDART', this.bluedart],
    ]);
  }

  private getProvider(carrierCode: string): ShippingProvider {
    const provider = this.providerRegistry.get(carrierCode.toUpperCase());
    if (!provider) {
      throw new BadRequestException(`Unsupported carrier code: ${carrierCode}`);
    }
    return provider;
  }

  // ─── Shipment Lifecycle ───────────────────────────────────────────────────

  async createShipment(
    orderId: string,
    sellerId: string,
    carrierCode: string,
    orderItemIds: string[],
  ) {
    this.logger.log(
      `Creating shipment for order ${orderId}, seller ${sellerId}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        customer: true,
        items: {
          where: {
            id: { in: orderItemIds },
            sellerId: sellerId,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.items.length === 0) {
      throw new BadRequestException(
        `No matching order items found for seller ${sellerId} in this request.`,
      );
    }

    if (!order.shippingAddress) {
      throw new BadRequestException(
        `Order ${orderId} is missing a shipping address.`,
      );
    }

    const provider = this.getProvider(carrierCode);

    // Build the adapter DTO payload
    const dto: CreateShipmentDto = {
      orderId: order.id,
      sellerId: sellerId,
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      customerPhone: order.shippingAddress.phone || '',
      customerEmail: order.customer.email,
      addressLine1: order.shippingAddress.street1,
      addressLine2: order.shippingAddress.street2 || undefined,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      items: order.items.map((item) => ({
        name: item.productName,
        sku: item.variantSku || item.productId || 'UNKNOWN_SKU',
        quantity: item.quantity,
        price: Number(item.price),
      })),
      totalWeightGrams: order.items.reduce(
        (acc, val) => acc + val.quantity * 500,
        0,
      ), // Default 500g per item
    };

    // Invoke carrier adapter
    const carrierRes = await provider.createShipment(dto);

    // Create database records
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        sellerId: sellerId,
        carrierCode: carrierCode.toUpperCase(),
        shipmentId: carrierRes.shipmentId,
        status: carrierRes.status,
        edd: carrierRes.edd,
        carrierMetadata: (carrierRes.carrierMetadata as never) || {},
        items: {
          create: order.items.map((item) => ({
            orderItemId: item.id,
            quantity: item.quantity,
          })),
        },
        trackingEvents: {
          create: {
            status: 'PENDING',
            description: 'Shipment created and awaiting AWB allocation.',
            eventTime: new Date(),
          },
        },
      },
      include: {
        items: true,
      },
    });

    // Update order items fulfillment status to PROCESSING
    await this.prisma.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { fulfillmentStatus: 'PROCESSING' },
    });

    return shipment;
  }

  async generateAwb(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (!shipment.shipmentId) {
      throw new BadRequestException(
        `Shipment does not have a carrier-assigned Shipment ID yet.`,
      );
    }

    const provider = this.getProvider(shipment.carrierCode);
    const awbRes = await provider.generateAwb(shipment.shipmentId);

    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        awb: awbRes.awb,
        status: ShipmentStatus.READY_TO_SHIP,
        edd: awbRes.edd || shipment.edd,
        carrierMetadata: {
          ...(shipment.carrierMetadata as Record<string, any>),
          ...(awbRes.carrierMetadata as Record<string, any>),
        },
        trackingEvents: {
          create: {
            status: 'READY_TO_SHIP',
            description: `AWB assigned: ${awbRes.awb}. Parcel is packed and ready for pickup scheduling.`,
            eventTime: new Date(),
          },
        },
      },
    });

    return updatedShipment;
  }

  async printLabel(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (!shipment.awb) {
      throw new BadRequestException(
        `Cannot print label before AWB generation.`,
      );
    }

    const provider = this.getProvider(shipment.carrierCode);
    const labelRes = await provider.printLabel(
      shipment.shipmentId || shipmentId,
    );

    // Save label URL or PDF data
    await this.prisma.shippingLabel.create({
      data: {
        shipmentId,
        labelUrl: labelRes.labelUrl,
        labelData: labelRes.labelData || null,
        mimeType: labelRes.mimeType,
      },
    });

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { labelUrl: labelRes.labelUrl },
    });

    return labelRes;
  }

  async schedulePickup(shipmentId: string, pickupTime: Date) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (!shipment.awb) {
      throw new BadRequestException(
        `Cannot schedule pickup before AWB generation.`,
      );
    }

    const provider = this.getProvider(shipment.carrierCode);
    const result = await provider.schedulePickup(
      shipment.shipmentId || shipmentId,
      pickupTime,
    );

    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.PICKUP_SCHEDULED,
        pickupScheduledAt: result.scheduledTime,
        trackingEvents: {
          create: {
            status: 'PICKUP_SCHEDULED',
            description: `Pickup scheduled for ${result.scheduledTime.toISOString()}.`,
            eventTime: new Date(),
          },
        },
      },
    });

    return updatedShipment;
  }

  // ─── Reverse Returns Lifecycle ─────────────────────────────────────────────

  async createReturn(
    orderId: string,
    customerId: string,
    items: Array<{ orderItemId: string; quantity: number }>,
    reason: ReturnReason,
    additionalNotes?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        customer: true,
        items: {
          where: {
            id: { in: items.map((i) => i.orderItemId) },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException(`Order does not belong to this customer.`);
    }

    // Determine seller (all return items in this request must belong to the same seller to create shipment)
    const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
    if (sellerIds.length !== 1) {
      throw new BadRequestException(
        `Returns must be grouped and requested per seller.`,
      );
    }
    const sellerId = sellerIds[0];

    // Compute refund amount sum
    let refundAmount = 0;
    for (const rItem of items) {
      const dbItem = order.items.find((i) => i.id === rItem.orderItemId);
      if (!dbItem) continue;
      refundAmount += Number(dbItem.price) * rItem.quantity;
    }

    // Choose primary carrier for returns: Shiprocket
    const provider = this.getProvider('SHIPROCKET');
    const returnDto: CreateShipmentDto = {
      orderId: order.id,
      sellerId: sellerId,
      customerName: `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`,
      customerPhone: order.shippingAddress?.phone || '',
      customerEmail: order.customer.email,
      addressLine1: order.shippingAddress?.street1 || '',
      addressLine2: order.shippingAddress?.street2 || undefined,
      city: order.shippingAddress?.city || '',
      state: order.shippingAddress?.state || '',
      postalCode: order.shippingAddress?.postalCode || '',
      country: order.shippingAddress?.country || '',
      items: order.items.map((item) => ({
        name: item.productName,
        sku: item.variantSku || item.productId || 'SKU',
        quantity: item.quantity,
        price: Number(item.price),
      })),
      totalWeightGrams: items.length * 500,
    };

    const returnRes = await provider.createReturn(returnDto);

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerId: customerId,
        sellerId: sellerId,
        status: ReturnRequestStatus.APPROVED,
        reason: reason,
        additionalNotes: additionalNotes,
        refundAmount: refundAmount,
        carrierCode: 'SHIPROCKET',
        returnAwb: returnRes.returnAwb,
        returnShipmentId: returnRes.returnShipmentId,
        items: {
          create: items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
    });

    return returnRequest;
  }

  // ─── Webhook Synchronization ───────────────────────────────────────────────

  async handleWebhook(carrierCode: string, payload: Record<string, any>) {
    this.logger.log(`Webhook received for ${carrierCode}`);

    // Standard logging
    const event = await this.prisma.carrierWebhookEvent.create({
      data: {
        carrierCode: carrierCode.toUpperCase(),
        payload: payload as never,
        status: WebhookStatus.RECEIVED,
      },
    });

    try {
      // Resolve shipment by AWB or Shipment ID depending on payload signature
      let awb = (payload.awb ||
        payload.awb_number ||
        payload.tracking_number) as string | undefined;
      const statusString = String(
        payload.status || payload.current_status || '',
      ).toUpperCase();

      if (!awb && payload.shipment_id) {
        const shipment = await this.prisma.shipment.findFirst({
          where: { shipmentId: String(payload.shipment_id) },
        });
        awb = shipment?.awb || undefined;
      }

      if (!awb) {
        throw new Error(
          'AWB or tracking information could not be resolved from webhook payload',
        );
      }

      const shipment = await this.prisma.shipment.findFirst({
        where: { awb: awb },
      });

      if (!shipment) {
        throw new NotFoundException(`No shipment found matching AWB: ${awb}`);
      }

      // Map carrier specific statuses to internal statuses
      let internalStatus: ShipmentStatus = shipment.status;
      const desc = String(
        payload.description || payload.activity || 'Tracking status update',
      );
      const loc = String(payload.location || payload.city || '');

      if (
        statusString.includes('IN_TRANSIT') ||
        statusString.includes('SHIPPED') ||
        statusString.includes('PICKED_UP')
      ) {
        internalStatus = ShipmentStatus.IN_TRANSIT;
      } else if (
        statusString.includes('OUT_FOR_DELIVERY') ||
        statusString.includes('DISPATCHED')
      ) {
        internalStatus = ShipmentStatus.OUT_FOR_DELIVERY;
      } else if (
        statusString.includes('DELIVERED') ||
        statusString.includes('COMPLETE')
      ) {
        internalStatus = ShipmentStatus.DELIVERED;
      } else if (
        statusString.includes('UNDELIVERED') ||
        statusString.includes('FAILED') ||
        statusString.includes('RTO')
      ) {
        internalStatus = ShipmentStatus.FAILED;
      }

      // Update shipment record
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: internalStatus,
          deliveredAt:
            internalStatus === ShipmentStatus.DELIVERED
              ? new Date()
              : shipment.deliveredAt,
          shippedAt:
            internalStatus === ShipmentStatus.IN_TRANSIT && !shipment.shippedAt
              ? new Date()
              : shipment.shippedAt,
          trackingEvents: {
            create: {
              status: statusString,
              location: loc,
              description: desc,
              eventTime: new Date(),
            },
          },
        },
      });

      // Update order fulfillment status if entire shipment status progresses
      if (internalStatus === ShipmentStatus.DELIVERED) {
        await this.prisma.orderItem.updateMany({
          where: {
            id: {
              in: (
                await this.prisma.shipmentItem.findMany({
                  where: { shipmentId: shipment.id },
                  select: { orderItemId: true },
                })
              ).map((si) => si.orderItemId),
            },
          },
          data: { fulfillmentStatus: 'DELIVERED' },
        });

        // Check if all items in order are completed
        const pendingItems = await this.prisma.orderItem.count({
          where: {
            orderId: shipment.orderId,
            fulfillmentStatus: { not: 'DELIVERED' },
          },
        });
        if (pendingItems === 0) {
          await this.prisma.order.update({
            where: { id: shipment.orderId },
            data: { status: 'DELIVERED' },
          });
        }
      } else if (internalStatus === ShipmentStatus.IN_TRANSIT) {
        await this.prisma.orderItem.updateMany({
          where: {
            id: {
              in: (
                await this.prisma.shipmentItem.findMany({
                  where: { shipmentId: shipment.id },
                  select: { orderItemId: true },
                })
              ).map((si) => si.orderItemId),
            },
          },
          data: { fulfillmentStatus: 'SHIPPED' },
        });
      }

      // Emit customer notifications if status changed
      const order = await this.prisma.order.findUnique({
        where: { id: shipment.orderId },
        select: { customerId: true, total: true },
      });
      if (order) {
        if (internalStatus === ShipmentStatus.DELIVERED) {
          this.eventEmitter.emit('notification.send', {
            userId: order.customerId,
            type: NotificationType.ORDER_DELIVERED,
            metadata: {
              orderId: shipment.orderId,
              amount: String(order.total),
            },
          });
        } else if (internalStatus === ShipmentStatus.IN_TRANSIT) {
          this.eventEmitter.emit('notification.send', {
            userId: order.customerId,
            type: NotificationType.ORDER_SHIPPED,
            metadata: {
              orderId: shipment.orderId,
              amount: String(order.total),
            },
          });
        }
      }

      // Update event log to PROCESSED
      await this.prisma.carrierWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await this.prisma.carrierWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookStatus.FAILED,
          errorMessage: errMsg,
        },
      });
      throw error;
    }
  }

  // ─── Dashboard Portals ─────────────────────────────────────────────────────

  async getSellerDashboard(sellerId: string) {
    const shipments = await this.prisma.shipment.findMany({
      where: { sellerId },
      include: {
        order: { select: { id: true, createdAt: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = {
      PENDING: 0,
      READY_TO_SHIP: 0,
      PICKUP_SCHEDULED: 0,
      IN_TRANSIT: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    shipments.forEach((s) => {
      if (statusCounts[s.status] !== undefined) {
        statusCounts[s.status]++;
      }
    });

    return {
      statusCounts,
      shipments,
    };
  }

  async getAdminDashboard() {
    const totalCount = await this.prisma.shipment.count();
    const deliveredCount = await this.prisma.shipment.count({
      where: { status: 'DELIVERED' },
    });
    const transitCount = await this.prisma.shipment.count({
      where: { status: 'IN_TRANSIT' },
    });
    const failedCount = await this.prisma.shipment.count({
      where: { status: 'FAILED' },
    });

    const recentWebhooks = await this.prisma.carrierWebhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      totalCount,
      deliveredCount,
      transitCount,
      failedCount,
      recentWebhooks,
      slaMetrics: {
        shiprocketDlvRatio:
          totalCount > 0 ? (deliveredCount / totalCount) * 100 : 100,
        averageTransitHours: 48,
      },
    };
  }
}
