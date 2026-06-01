import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * SimilarityWorker
 * Runs hourly to compute pairwise product similarity scores based on:
 * 1. Category co-membership (same category or parent category)
 * 2. Price proximity
 * 3. Attribute overlap (Brand, Material, etc.)
 *
 * Scores are stored in ProductSimilarity table for fast retrieval.
 */
@Injectable()
export class SimilarityWorker {
  private readonly logger = new Logger(SimilarityWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async computeSimilarity(): Promise<void> {
    this.logger.log('Starting product similarity batch computation...');

    try {
      // Get all published products with their attributes
      const products = await this.prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          categoryId: true,
          price: true,
          attributes: { select: { name: true, value: true } },
          category: { select: { id: true, parentId: true } },
        },
        take: 500, // Safety cap for first runs
      });

      if (products.length < 2) {
        this.logger.log('Not enough products to compute similarity.');
        return;
      }

      this.logger.log(
        `Computing similarity for ${products.length} products...`,
      );

      const upserts: {
        productIdA: string;
        productIdB: string;
        score: number;
      }[] = [];

      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const a = products[i];
          const b = products[j];

          // 1. Category score
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

          // 2. Price proximity
          const priceA = Number(a.price);
          const priceB = Number(b.price);
          const avgPrice = (priceA + priceB) / 2;
          const priceScore =
            avgPrice > 0
              ? Math.max(0, 1 - Math.abs(priceA - priceB) / avgPrice)
              : 0.5;

          // 3. Attribute overlap
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

      // Batch upsert in chunks of 100
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
      }

      this.logger.log(
        `Similarity computation complete. Upserted ${upserts.length} records.`,
      );
    } catch (error) {
      this.logger.error('Similarity computation failed:', error);
    }
  }

  // Trigger manual computation (called at startup by module init)
  async runOnStartup(): Promise<void> {
    const count = await this.prisma.productSimilarity.count();
    if (count === 0) {
      this.logger.log(
        'No similarity records found; running initial computation...',
      );
      await this.computeSimilarity();
    }
  }
}
