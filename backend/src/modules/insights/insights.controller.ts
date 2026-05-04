import { Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsUUID } from 'class-validator';
import { InsightsService } from './insights.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { posthog } from '../../posthog';

class InsightIdParamDto {
  @IsUUID()
  id: string;
}

@Controller('insights')
@UseGuards(BetterAuthGuard)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly usersService: UsersService,
  ) {}

  // Run insight engine + return fresh cards — 6 per minute keeps DB/AI load bounded
  @Throttle({ global: { limit: 6, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const result = await this.insightsService.refreshAndGetInsights(profile.id);
    posthog.capture({
      distinctId: user.id,
      event: 'insights_refreshed',
      properties: {
        insights_count: Array.isArray(result) ? result.length : undefined,
      },
    });
    return result;
  }

  // Get active (non-expired) insights without re-running engine
  @Get()
  async getInsights(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.insightsService.getActiveInsights(profile.id);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const count = await this.insightsService.getUnreadCount(profile.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(
    @Param() params: InsightIdParamDto,
    @CurrentUser() user: { id: string },
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    await this.insightsService.markRead(params.id, profile.id);
    posthog.capture({
      distinctId: user.id,
      event: 'insight_read',
      properties: { insight_id: params.id },
    });
    return { success: true };
  }

  @Get('weekly-summary')
  async getWeeklySummary(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.insightsService.getWeeklySummary(profile.id);
  }
}
