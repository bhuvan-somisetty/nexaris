import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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

describe('Enterprise Hardening & Telemetry (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let adminToken: string;
  const testEmail = `cust_${Date.now()}@example.com`;
  const adminEmail = `admin_${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail, adminEmail] },
      },
    });
    await app.close();
  });

  describe('Authentication & Role Validation', () => {
    it('should register a customer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          role: 'CUSTOMER',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testEmail);
    });

    it('should register an admin successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: adminEmail,
          password: 'AdminPassword123!',
          role: 'ADMIN',
          firstName: 'Platform',
          lastName: 'Manager',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(adminEmail);
    });

    it('should login customer and return JWT accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      customerToken = response.body.accessToken;
    });

    it('should login admin and return JWT accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminEmail,
          password: 'AdminPassword123!',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      adminToken = response.body.accessToken;
    });
  });

  describe('Search & Typo-Tolerance Endpoint', () => {
    it('should query search endpoint successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('facets');
    });

    it('should query autocomplete suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/search/autocomplete?q=t')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('suggestions');
    });
  });

  describe('Prometheus Metrics Exporter', () => {
    it('should expose /metrics with prometheus metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('bullmq_queue_jobs');
    });
  });

  describe('Admin Observability stats', () => {
    it('should block non-admins from retrieving statistics', async () => {
      await request(app.getHttpServer())
        .get('/admin/observability')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow admins to fetch queue status, memory, and connection states', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/observability')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('queues');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('redis');
      expect(response.body).toHaveProperty('database');
    });
  });

  describe('Rate Limiter (Throttler) Hardening', () => {
    it('should return HTTP 429 when exceeding auth rate limit', async () => {
      // Trigger multiple auth operations in rapid succession
      // Limit is 5 requests per minute, so 6+ should fail
      const authPromises = Array.from({ length: 6 }).map(() =>
        request(app.getHttpServer()).post('/auth/login').send({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      );

      const responses = await Promise.all(authPromises);
      const limitExceeded = responses.some(
        (res) => res.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(limitExceeded).toBe(true);
    });
  });
});
