import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('db')
  async getDbHealth() {
    try {
      // Query raw 1 to verify postgres database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: err.message || 'Database connection test failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
