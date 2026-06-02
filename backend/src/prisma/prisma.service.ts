import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Configure Prisma to emit query events
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Register a query event listener to log slow queries (>150ms)
    (this as any).$on('query', (e: any) => {
      if (e.duration > 150) {
        this.logger.warn(
          `Slow Query Detected: ${e.query} (Params: ${e.params}) -- Took ${e.duration}ms`,
        );
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
