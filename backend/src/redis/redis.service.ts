import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis, { Cluster } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | Cluster | null = null;
  private useFallback = false;
  private readonly fallbackCache = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor() {
    try {
      this.logger.log('Initializing Redis client...');

      // 1. Cluster Mode
      if (process.env.REDIS_CLUSTER_NODES) {
        this.logger.log('Redis initialized in CLUSTER mode');
        const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map((node) => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port || '6379', 10) };
        });
        this.client = new Redis.Cluster(nodes, {
          redisOptions: {
            maxRetriesPerRequest: null, // Set null for BullMQ compatibility
            connectTimeout: 2000,
          },
        });
      }
      // 2. Sentinel Mode
      else if (process.env.REDIS_SENTINELS) {
        this.logger.log('Redis initialized in SENTINEL mode');
        const sentinels = process.env.REDIS_SENTINELS.split(',').map(
          (sentinel) => {
            const [host, port] = sentinel.split(':');
            return { host, port: parseInt(port || '26379', 10) };
          },
        );
        const name = process.env.REDIS_SENTINEL_NAME || 'mymaster';
        this.client = new Redis({
          sentinels,
          name,
          maxRetriesPerRequest: null, // Set null for BullMQ compatibility
          connectTimeout: 2000,
        });
      }
      // 3. Standalone Mode
      else {
        this.logger.log('Redis initialized in STANDALONE mode');
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

        if (redisUrl) {
          this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: null, // Set null for BullMQ compatibility
            connectTimeout: 2000,
          });
        } else {
          this.client = new Redis({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: null, // Set null for BullMQ compatibility
            connectTimeout: 2000,
          });
        }
      }

      this.client.on('error', (err) => {
        this.logger.warn(
          `Redis connection error: ${err.message}. Switching to in-memory fallback.`,
        );
        this.useFallback = true;
      });

      this.client.on('connect', () => {
        this.logger.log('Successfully connected to Redis.');
        this.useFallback = false;
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to initialize Redis: ${error.message}. Using in-memory fallback.`,
      );
      this.useFallback = true;
    }
  }

  getClient(): Redis | Cluster | null {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useFallback || !this.client) {
      return this.getFromFallback<T>(key);
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.error(
        `Error reading from Redis for key ${key}: ${err.message}`,
      );
      return this.getFromFallback<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 900): Promise<void> {
    if (this.useFallback || !this.client) {
      this.setInFallback(key, value, ttlSeconds);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.error(
        `Error writing to Redis for key ${key}: ${err.message}`,
      );
      this.setInFallback(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useFallback || !this.client) {
      this.fallbackCache.delete(key);
      return;
    }

    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.error(
        `Error deleting from Redis for key ${key}: ${err.message}`,
      );
      this.fallbackCache.delete(key);
    }
  }

  // --- Resilient Fallback Cache Helpers ---
  private getFromFallback<T>(key: string): T | null {
    const record = this.fallbackCache.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.fallbackCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(record.value) as T;
    } catch {
      return null;
    }
  }

  private setInFallback<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const valueStr = JSON.stringify(value);
    this.fallbackCache.set(key, { value: valueStr, expiresAt });

    // Periodically clean expired keys
    if (this.fallbackCache.size > 1000) {
      this.cleanExpiredFallbackKeys();
    }
  }

  private cleanExpiredFallbackKeys() {
    const now = Date.now();
    for (const [key, record] of this.fallbackCache.entries()) {
      if (now > record.expiresAt) {
        this.fallbackCache.delete(key);
      }
    }
  }
}
