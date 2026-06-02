import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationsService } from '../../recommendations/recommendations.service';

@Processor('recommendation')
export class RecommendationWorker extends WorkerHost {
  private readonly logger = new Logger(RecommendationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationsService: RecommendationsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing recommendation job: ${job.name} (ID: ${job.id})`,
    );

    try {
      if (job.name === 'computeSimilarity') {
        await this.handleComputeSimilarity(job);
      } else if (job.name === 'updatePreferences') {
        await this.handleUpdatePreferences(job);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Job ${job.name} failed: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger BullMQ's retry logic
    }
  }

  private async handleComputeSimilarity(job: Job): Promise<void> {
    this.logger.log(
      'Starting similarity matrix computation via BullMQ worker...',
    );

    // Get all published products
    const products = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        categoryId: true,
        price: true,
        attributes: { select: { name: true, value: true } },
        category: { select: { id: true, parentId: true } },
      },
      take: 500, // Safety cap
    });

    if (products.length < 2) {
      this.logger.log('Not enough products to compute similarity.');
      return;
    }

    const upserts: {
      productIdA: string;
      productIdB: string;
      score: number;
    }[] = [];

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const a = products[i];
        const b = products[j];

        let categoryScore = 0;
        if (a.categoryId === b.categoryId) {
          categoryScore = 1.0;
        } else if (
          a.category.parentId &&
          b.category.parentId &&
          a.category.parentId === b.category.parentId
        ) {
          categoryScore = 0.5;
        }

        if (categoryScore === 0) continue; // Skip cross-category pairs

        const priceA = Number(a.price);
        const priceB = Number(b.price);
        const avgPrice = (priceA + priceB) / 2;
        const priceScore =
          avgPrice > 0
            ? Math.max(0, 1 - Math.abs(priceA - priceB) / avgPrice)
            : 0.5;

        const attrsA = new Map(a.attributes.map((at) => [at.name, at.value]));
        const attrsB = new Map(b.attributes.map((at) => [at.name, at.value]));
        const allKeys = new Set([...attrsA.keys(), ...attrsB.keys()]);
        let matchCount = 0;
        for (const key of allKeys) {
          if (attrsA.get(key) === attrsB.get(key)) matchCount++;
        }
        const attrScore = allKeys.size > 0 ? matchCount / allKeys.size : 0;

        const finalScore =
          categoryScore * 0.5 + priceScore * 0.3 + attrScore * 0.2;

        if (finalScore > 0.2) {
          upserts.push({
            productIdA: a.id,
            productIdB: b.id,
            score: finalScore,
          });
        }
      }
    }

    // Process chunk updates
    const chunkSize = 100;
    for (let i = 0; i < upserts.length; i += chunkSize) {
      const chunk = upserts.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((row) =>
          this.prisma.productSimilarity.upsert({
            where: {
              productIdA_productIdB: {
                productIdA: row.productIdA,
                productIdB: row.productIdB,
              },
            },
            create: {
              productIdA: row.productIdA,
              productIdB: row.productIdB,
              score: row.score,
            },
            update: { score: row.score },
          }),
        ),
      );
      // Update job progress
      const progressPercent = Math.min(
        100,
        Math.round(((i + chunk.length) / upserts.length) * 100),
      );
      await job.updateProgress(progressPercent);
    }

    this.logger.log(
      `Similarity computation complete. Processed ${upserts.length} records.`,
    );
  }

  private async handleUpdatePreferences(job: Job): Promise<void> {
    this.logger.log('Starting preference profiles update via BullMQ worker...');
    const since = new Date(Date.now() - 30 * 60 * 1000); // Last 30 mins

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
      `Updating preferences profiles for ${userIds.length} users...`,
    );

    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map((userId) =>
          this.recommendationsService
            .updateUserPreferenceProfile(userId)
            .catch((err: any) => {
              this.logger.warn(
                `Failed to update preferences for user ${userId}: ${err.message}`,
              );
            }),
        ),
      );
      const progressPercent = Math.min(
        100,
        Math.round(((i + batch.length) / userIds.length) * 100),
      );
      await job.updateProgress(progressPercent);
    }

    this.logger.log('Preference updates complete.');
  }
}
