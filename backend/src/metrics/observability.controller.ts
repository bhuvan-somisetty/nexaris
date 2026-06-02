import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/observability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ObservabilityController {
  constructor(
    @InjectQueue('fulfillment') private readonly fulfillmentQueue: Queue,
    @InjectQueue('shipping-update') private readonly shippingUpdateQueue: Queue,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
    @InjectQueue('recommendation') private readonly recommendationQueue: Queue,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getStats() {
    // 1. Queue statistics
    const queues = {
      fulfillment: await this.getQueueStats(this.fulfillmentQueue),
      shippingUpdate: await this.getQueueStats(this.shippingUpdateQueue),
      notification: await this.getQueueStats(this.notificationQueue),
      recommendation: await this.getQueueStats(this.recommendationQueue),
    };

    // 2. System status
    const memory = process.memoryUsage();
    const system = {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
      },
      cpu: process.cpuUsage(),
    };

    // 3. Redis details
    let redisInfo = {
      status: 'DISCONNECTED',
      uptime: 0,
      connectedClients: 0,
      memoryUsed: '0 MB',
    };
    const redisClient = this.redisService.getClient();
    if (redisClient && (redisClient as any).status === 'ready') {
      try {
        if (typeof (redisClient as any).info === 'function') {
          const infoRaw = await (redisClient as any).info();
          redisInfo = {
            status: 'CONNECTED',
            uptime: parseInt(
              this.parseRedisInfo(infoRaw, 'uptime_in_seconds') || '0',
              10,
            ),
            connectedClients: parseInt(
              this.parseRedisInfo(infoRaw, 'connected_clients') || '0',
              10,
            ),
            memoryUsed:
              this.parseRedisInfo(infoRaw, 'used_memory_human') || '0 MB',
          };
        } else {
          redisInfo.status = 'CONNECTED';
        }
      } catch {
        redisInfo.status = 'ERROR';
      }
    }

    // 4. DB Statistics
    let dbStatus = 'CONNECTED';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'ERROR';
    }

    return {
      queues,
      system,
      redis: redisInfo,
      database: { status: dbStatus },
    };
  }

  @Post('queues/:queueName/retry-failed')
  async retryFailedJobs(@Param('queueName') queueName: string) {
    let targetQueue: Queue | null = null;
    if (queueName === 'fulfillment') targetQueue = this.fulfillmentQueue;
    else if (queueName === 'shipping-update')
      targetQueue = this.shippingUpdateQueue;
    else if (queueName === 'notification') targetQueue = this.notificationQueue;
    else if (queueName === 'recommendation')
      targetQueue = this.recommendationQueue;

    if (!targetQueue) {
      throw new BadRequestException(`Queue ${queueName} not found`);
    }

    try {
      const failedJobs = await targetQueue.getFailed();
      await Promise.all(failedJobs.map((job) => job.retry()));
      return { retriedCount: failedJobs.length };
    } catch (error: any) {
      throw new BadRequestException(`Failed to retry jobs: ${error.message}`);
    }
  }

  private async getQueueStats(queue: Queue) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      return { waiting, active, completed, failed, delayed };
    } catch {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  private parseRedisInfo(info: string, key: string): string | null {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(key + ':')) {
        return line.split(':')[1];
      }
    }
    return null;
  }
}
