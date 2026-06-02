import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { RecommendationWorker } from './workers/recommendation.worker';
import { FulfillmentWorker } from './workers/fulfillment.worker';
import { ShippingUpdateWorker } from './workers/shipping-update.worker';
import { NotificationWorker } from './workers/notification.worker';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService): any => {
        const client = redisService.getClient();
        if (!client) {
          throw new Error(
            'Redis client not initialized before BullMQ bootstrap.',
          );
        }
        return {
          connection: client as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10000, // 10s base delay for retries
            },
            removeOnComplete: {
              count: 1000, // Retain last 1000 successful jobs for logging
            },
            removeOnFail: false, // Keep failed jobs in Redis for DLQ management
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'fulfillment' },
      { name: 'shipping-update' },
      { name: 'notification' },
      { name: 'recommendation' },
    ),
    PrismaModule,
    RecommendationsModule,
  ],
  providers: [
    RecommendationWorker,
    FulfillmentWorker,
    ShippingUpdateWorker,
    NotificationWorker,
  ],
  exports: [BullModule],
})
export class QueueModule {}
