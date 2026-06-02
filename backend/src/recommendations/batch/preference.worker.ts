import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * PreferenceWorker
 * Runs every 30 minutes to queue UserPreferenceProfiles updates
 * for active users using BullMQ.
 */
@Injectable()
export class PreferenceWorker {
  private readonly logger = new Logger(PreferenceWorker.name);

  constructor(
    @InjectQueue('recommendation') private readonly recommendationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updatePreferences(): Promise<void> {
    this.logger.log(
      'Cron triggered: scheduling user preference profile updates to BullMQ...',
    );
    try {
      await this.recommendationQueue.add('updatePreferences', {});
      this.logger.log('Preference update job successfully enqueued.');
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue preference update job: ${error.message}`,
      );
    }
  }
}
