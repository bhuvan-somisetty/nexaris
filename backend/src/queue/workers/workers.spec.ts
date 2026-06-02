import { Test, TestingModule } from '@nestjs/testing';
import { FulfillmentWorker } from './fulfillment.worker';
import { NotificationWorker } from './notification.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';
import { NotificationType } from '@prisma/client';

describe('BullMQ Queue Workers (Unit)', () => {
  let fulfillmentWorker: FulfillmentWorker;
  let notificationWorker: NotificationWorker;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    notificationDeliveryLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentWorker,
        NotificationWorker,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    fulfillmentWorker = module.get<FulfillmentWorker>(FulfillmentWorker);
    notificationWorker = module.get<NotificationWorker>(NotificationWorker);
    jest.clearAllMocks();
  });

  describe('FulfillmentWorker', () => {
    it('should skip fulfillment processing if order is not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      const mockJob = {
        name: 'processOrderFulfillment',
        id: '123',
        data: { orderId: 'non-existent-id' },
      } as Job;

      await fulfillmentWorker.process(mockJob);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        include: { items: true },
      });
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should process order fulfillment and log audit log when order is found', async () => {
      const mockOrder = {
        id: 'order-123',
        customerId: 'user-123',
        subtotal: 100,
        total: 110,
        items: [{ id: 'item-1' }],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const mockJob = {
        name: 'processOrderFulfillment',
        id: '123',
        data: { orderId: 'order-123' },
      } as Job;

      await fulfillmentWorker.process(mockJob);
      expect(mockPrisma.order.findUnique).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('NotificationWorker', () => {
    it('should create notification and delivery logs', async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-123' });
      mockPrisma.notificationDeliveryLog.create.mockResolvedValue({});

      const mockJob = {
        name: 'sendNotification',
        id: '999',
        data: {
          userId: 'user-123',
          type: NotificationType.ORDER_CREATED,
          title: 'Order Confirmation',
          message: 'Your order was successfully created.',
        },
      } as Job;

      await notificationWorker.process(mockJob);
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.notificationDeliveryLog.create).toHaveBeenCalled();
    });
  });
});
