import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async getHealth() {
    const [db, redis] = await Promise.all([this.health.checkDatabase(), this.health.checkRedis()]);
    const ok = db.ok && redis.ok;
    return { status: ok ? 'ok' : 'degraded', checks: { database: db, redis } };
  }
}
