import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async getHealth() {
    const [db, redis] = await Promise.all([this.health.checkDatabase(), this.health.checkRedis()]);
    // Database must be healthy. Redis is a cache — if it's not configured,
    // that's fine. If it IS configured but unreachable, degrade.
    const redisOk = !redis.configured || redis.ok;
    const ok = db.ok && redisOk;
    return { status: ok ? 'ok' : 'degraded', checks: { database: db, redis } };
  }
}
