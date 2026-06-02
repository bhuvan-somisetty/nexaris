import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as client from 'prom-client';

@Controller('metrics')
export class MetricsController {
  private readonly queueJobsActive: client.Gauge<string>;
  private readonly queueJobsFailed: client.Gauge<string>;
  private readonly queueJobsWaiting: client.Gauge<string>;

  constructor(
    @InjectQueue('fulfillment') private readonly fulfillmentQueue: Queue,
    @InjectQueue('shipping-update') private readonly shippingUpdateQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    @InjectQueue('recommendation') private readonly recommendationQueue: Queue,
  ) {
    // Clean registry to avoid collisions in testing environments
    client.register.clear();
    client.collectDefaultMetrics({ register: client.register });

    // Initialize BullMQ metric gauges
    this.queueJobsActive = new client.Gauge({
      name: 'bullmq_queue_jobs_active',
      help: 'Number of active jobs in BullMQ',
      labelNames: ['queue'],
    });

    this.queueJobsFailed = new client.Gauge({
      name: 'bullmq_queue_jobs_failed',
      help: 'Number of failed jobs in BullMQ',
      labelNames: ['queue'],
    });

    this.queueJobsWaiting = new client.Gauge({
      name: 'bullmq_queue_jobs_waiting',
      help: 'Number of waiting jobs in BullMQ',
      labelNames: ['queue'],
    });
  }

  @Get()
  async getMetrics(@Res() res: Response) {
    // Collect active gauges from queue instances
    await this.updateQueueMetrics('fulfillment', this.fulfillmentQueue);
    await this.updateQueueMetrics('shipping-update', this.shippingUpdateQueue);
    await this.updateQueueMetrics('notification', this.notificationQueue);
    await this.updateQueueMetrics('recommendation', this.recommendationQueue);

    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  }

  private async updateQueueMetrics(name: string, queue: Queue) {
    try {
      const [active, failed, waiting] = await Promise.all([
        queue.getActiveCount(),
        queue.getFailedCount(),
        queue.getWaitingCount(),
      ]);

      this.queueJobsActive.set({ queue: name }, active);
      this.queueJobsFailed.set({ queue: name }, failed);
      this.queueJobsWaiting.set({ queue: name }, waiting);
    } catch {
      // Swallowing connection/redis errors to prevent metric endpoint crashes
    }
  }
}
