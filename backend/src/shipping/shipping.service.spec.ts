import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShiprocketAdapter } from './adapters/shiprocket.adapter';
import { DelhiveryAdapter } from './adapters/delhivery.adapter';
import { BlueDartAdapter } from './adapters/bluedart.adapter';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: PrismaService,
          useValue: {},
        },
        ShiprocketAdapter,
        DelhiveryAdapter,
        BlueDartAdapter,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
