import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ObservabilityController } from './observability.controller';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [QueueModule, PrismaModule, RedisModule],
  controllers: [MetricsController, ObservabilityController],
})
export class MetricsModule {}
