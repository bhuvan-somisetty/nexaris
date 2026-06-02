import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ShipmentStatus, OrderStatus, FulfillmentStatus } from '@prisma/client';

@Processor('shipping-update')
export class ShippingUpdateWorker extends WorkerHost {
  private readonly logger = new Logger(ShippingUpdateWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing shipping-update job: ${job.name} (ID: ${job.id})`,
    );

    try {
      if (job.name === 'syncCarrierWebhook') {
        await this.handleCarrierWebhook(job);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Shipping update job ${job.name} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleCarrierWebhook(
    job: Job<{
      shipmentId: string;
      status: ShipmentStatus;
      eventDescription: string;
      location?: string;
    }>,
  ): Promise<void> {
    const { shipmentId, status, eventDescription, location } = job.data;
    this.logger.log(`Updating shipment ${shipmentId} state to: ${status}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { include: { shipments: true, items: true } } },
    });

    if (!shipment) {
      this.logger.warn(`Shipment ${shipmentId} not found.`);
      return;
    }

    // Use transaction to update status, insert tracking event, and sync order
    await this.prisma.$transaction(async (tx) => {
      // 1. Update Shipment status
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status,
          shippedAt:
            status === ShipmentStatus.IN_TRANSIT ? new Date() : undefined,
          deliveredAt:
            status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        },
      });

      // 2. Create ShipmentTrackingEvent record
      await tx.shipmentTrackingEvent.create({
        data: {
          shipmentId,
          status,
          description: eventDescription,
          location: location || 'Transit Hub',
          eventTime: new Date(),
        },
      });

      // 3. Synchronize Order fulfillment state if all shipments are in particular states
      // Fetch other shipments for this order within this transaction context
      const allShipments = await tx.shipment.findMany({
        where: { orderId: shipment.orderId },
      });

      const totalShipments = allShipments.length;
      const deliveredCount = allShipments.filter(
        (s) => s.status === ShipmentStatus.DELIVERED,
      ).length;
      const shippedCount = allShipments.filter((s) =>
        (
          [
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.DELIVERED,
          ] as ShipmentStatus[]
        ).includes(s.status),
      ).length;

      let nextOrderStatus: OrderStatus | null = null;
      let nextFulfillmentStatus: FulfillmentStatus | null = null;

      if (deliveredCount === totalShipments && totalShipments > 0) {
        nextOrderStatus = OrderStatus.DELIVERED;
        nextFulfillmentStatus = FulfillmentStatus.DELIVERED;
      } else if (shippedCount > 0) {
        nextOrderStatus = OrderStatus.SHIPPED;
        nextFulfillmentStatus = FulfillmentStatus.SHIPPED;
      }

      if (nextOrderStatus) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: nextOrderStatus },
        });

        // Add order timeline record
        await tx.orderTimeline.create({
          data: {
            orderId: shipment.orderId,
            status: nextOrderStatus,
            notes: `Fulfillment synchronized dynamically to: ${nextOrderStatus}.`,
          },
        });
      }

      // 4. Send asynchronous notification (by pushing to the notification queue)
      // This worker will emit standard logs which we can monitor.
      this.logger.log(
        `Shipment status successfully updated for ID: ${shipmentId}. Sync status: ${status}.`,
      );
    });
  }
}
