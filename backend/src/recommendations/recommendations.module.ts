import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { SimilarityWorker } from './batch/similarity.worker';
import { PreferenceWorker } from './batch/preference.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, SimilarityWorker, PreferenceWorker],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
