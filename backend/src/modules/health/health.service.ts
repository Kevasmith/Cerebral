import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as admin from 'firebase-admin';
import { createKeyv } from '@keyv/redis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private config: ConfigService, private dataSource: DataSource) {}

  /**
   * Check database connectivity by running a simple SELECT 1
   */
  async checkDatabase(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      this.logger.warn('Database health check failed', err?.message || err);
      return { ok: false, error: String(err?.message || err) };
    }
  }

  /**
   * Check Redis connectivity by instantiating a Keyv client and doing a noop set/get
   */
  async checkRedis(): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = this.config.get('redis') as any;
      const redisUrl = r?.url || process.env.REDIS_URL || `redis://${r?.host ?? 'localhost'}:${r?.port ?? 6379}`;
      const kv = createKeyv(redisUrl);
      // use a short-lived key
      await kv.set('__health_check__', '1', 5);
      const v = await kv.get('__health_check__');
      return { ok: v === '1' || v === 1 || v === '1' };
    } catch (err) {
      this.logger.warn('Redis health check failed', err?.message || err);
      return { ok: false, error: String(err?.message || err) };
    }
  }

  /**
   * Check Firebase admin initialization
   */
  checkFirebase(): { ok: boolean; initialized: boolean } {
    try {
      const initialized = !!admin.apps.length;
      return { ok: true, initialized };
    } catch (err) {
      this.logger.warn('Firebase health check failed', err?.message || err);
      return { ok: false, initialized: false };
    }
  }
}
