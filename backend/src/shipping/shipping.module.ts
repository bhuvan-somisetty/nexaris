import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ShiprocketAdapter } from './adapters/shiprocket.adapter';
import { DelhiveryAdapter } from './adapters/delhivery.adapter';
import { BlueDartAdapter } from './adapters/bluedart.adapter';

@Module({
  imports: [PrismaModule],
  providers: [
    ShippingService,
    ShiprocketAdapter,
    DelhiveryAdapter,
    BlueDartAdapter,
  ],
  controllers: [ShippingController],
})
export class ShippingModule {}
