import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.mock('../src/queue/queue.module', () => {
  const { Module, Global } = require('@nestjs/common');
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    getFailed: jest.fn().mockResolvedValue([]),
  };

  const providers = [
    { provide: 'BullQueue_fulfillment', useValue: mockQueue },
    { provide: 'BullQueue_shipping-update', useValue: mockQueue },
    { provide: 'BullQueue_notification', useValue: mockQueue },
    { provide: 'BullQueue_recommendation', useValue: mockQueue },
  ];

  @Global()
  @Module({
    providers,
    exports: providers.map((p) => p.provide),
  })
  class MockQueueModule {}

  return { QueueModule: MockQueueModule };
});

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
