import { Module } from '@nestjs/common';
import { SellerRatingsService } from './seller-ratings.service';
import { SellerRatingsController } from './seller-ratings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SellerRatingsController],
  providers: [SellerRatingsService],
  exports: [SellerRatingsService],
})
export class SellerRatingsModule {}
