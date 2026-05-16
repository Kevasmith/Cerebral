import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createKeyv } from '@keyv/redis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private config: ConfigService, private dataSource: DataSource) {}

  async checkDatabase(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      this.logger.warn('Database health check failed', err?.message || err);
      return { ok: false, error: String(err?.message || err) };
    }
  }

  // Returns `configured: false` when there's no REDIS_URL — caller treats this
  // as "skip" rather than a hard failure. Redis is a cache, not critical.
  async checkRedis(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
    const r = this.config.get('redis') as any;
    const redisUrl = r?.url || process.env.REDIS_URL;
    if (!redisUrl) {
      return { ok: false, configured: false };
    }
    try {
      const kv = createKeyv(redisUrl);
      await kv.set('__health_check__', '1', 5);
      const v = await kv.get('__health_check__');
      return { ok: v === '1' || v === 1, configured: true };
    } catch (err) {
      this.logger.warn('Redis health check failed', err?.message || err);
      return { ok: false, configured: true, error: String(err?.message || err) };
    }
  }
}
