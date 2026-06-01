import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { CheckoutController } from './checkout.controller';
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController, CheckoutController],
  providers: [OrdersService, CheckoutService],
  exports: [OrdersService, CheckoutService],
})
export class OrdersModule {}
