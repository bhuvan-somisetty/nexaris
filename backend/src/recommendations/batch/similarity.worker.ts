import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * SimilarityWorker
 * Runs hourly to queue pairwise product similarity score computation
 * to the BullMQ recommendation queue.
 */
@Injectable()
export class SimilarityWorker {
  private readonly logger = new Logger(SimilarityWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recommendation') private readonly recommendationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async computeSimilarity(): Promise<void> {
    this.logger.log(
      'Cron triggered: scheduling product similarity computation to BullMQ...',
    );
    try {
      await this.recommendationQueue.add('computeSimilarity', {});
      this.logger.log('Similarity computation job successfully enqueued.');
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue similarity computation job: ${error.message}`,
      );
    }
  }

  // Trigger manual computation if no similarity records exist (startup initialization)
  async runOnStartup(): Promise<void> {
    const count = await this.prisma.productSimilarity.count();
    if (count === 0) {
      this.logger.log(
        'No similarity records found on startup; scheduling initial computation...',
      );
      try {
        await this.recommendationQueue.add('computeSimilarity', {});
        this.logger.log(
          'Initial similarity computation job successfully enqueued.',
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to enqueue initial similarity job: ${error.message}`,
        );
      }
    }
  }
}
