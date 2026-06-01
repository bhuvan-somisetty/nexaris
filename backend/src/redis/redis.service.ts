import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private useFallback = false;
  private readonly fallbackCache = new Map<string, { value: string; expiresAt: number }>();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    try {
      this.logger.log('Initializing Redis client...');
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
      } else {
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
      }

      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}. Switching to in-memory fallback.`);
        this.useFallback = true;
      });

      this.client.on('connect', () => {
        this.logger.log('Successfully connected to Redis.');
        this.useFallback = false;
      });
    } catch (error: any) {
      this.logger.warn(`Failed to initialize Redis: ${error.message}. Using in-memory fallback.`);
      this.useFallback = true;
    }
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
      this.logger.error(`Error reading from Redis for key ${key}: ${err.message}`);
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
      this.logger.error(`Error writing to Redis for key ${key}: ${err.message}`);
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
      this.logger.error(`Error deleting from Redis for key ${key}: ${err.message}`);
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
