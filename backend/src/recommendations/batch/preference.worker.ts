import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationsService } from '../recommendations.service';

/**
 * PreferenceWorker
 * Runs every 30 minutes to update UserPreferenceProfiles
 * for users who have had recent activity.
 */
@Injectable()
export class PreferenceWorker {
  private readonly logger = new Logger(PreferenceWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updatePreferences(): Promise<void> {
    this.logger.log('Starting user preference profile update...');

    try {
      const since = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes

      // Find users with recent activity
      const recentActivityUsers = await this.prisma.userActivity.findMany({
        where: {
          userId: { not: null },
          createdAt: { gte: since },
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      const userIds = recentActivityUsers
        .map((u) => u.userId)
        .filter(Boolean) as string[];

      if (userIds.length === 0) {
        this.logger.log(
          'No users with recent activity; skipping preference update.',
        );
        return;
      }

      this.logger.log(
        `Updating preference profiles for ${userIds.length} users...`,
      );

      // Process in batches of 10 to avoid overloading the DB
      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map((userId) =>
            this.recommendationsService
              .updateUserPreferenceProfile(userId)
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                  `Failed to update preferences for user ${userId}: ${msg}`,
                );
              }),
          ),
        );
      }

      // Evict personalized caches for affected users
      this.logger.log('Preference update complete.');
    } catch (error) {
      this.logger.error('Preference update failed:', error);
    }
  }
}
