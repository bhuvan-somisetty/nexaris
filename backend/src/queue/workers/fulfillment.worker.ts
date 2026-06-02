import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('fulfillment')
export class FulfillmentWorker extends WorkerHost {
  private readonly logger = new Logger(FulfillmentWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing fulfillment job: ${job.name} (ID: ${job.id})`);

    try {
      if (job.name === 'processOrderFulfillment') {
        await this.handleOrderFulfillment(job);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Fulfillment job ${job.name} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleOrderFulfillment(
    job: Job<{ orderId: string }>,
  ): Promise<void> {
    const { orderId } = job.data;
    this.logger.log(
      `Beginning asynchronous fulfillment actions for Order: ${orderId}`,
    );

    // Fetch the order with items
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found. Skipping fulfillment.`);
      return;
    }

    // Simulate invoice generation
    this.logger.log(
      `Generating digital invoice and auditing order ledger entries for Order: ${orderId}...`,
    );

    // Log an audit log entry for order fulfillment bootstrap
    await this.prisma.auditLog.create({
      data: {
        userId: order.customerId,
        action: 'ORDER_FULFILLMENT_QUEUED',
        entity: 'ORDER',
        entityId: orderId,
        newValue: {
          subtotal: order.subtotal.toString(),
          total: order.total.toString(),
          itemCount: order.items.length,
        },
      },
    });

    // Simulate completion
    this.logger.log(
      `Fulfillment activities for Order ${orderId} successfully completed.`,
    );
  }
}
