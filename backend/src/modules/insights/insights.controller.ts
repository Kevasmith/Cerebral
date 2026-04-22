import { Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('insights')
@UseGuards(FirebaseAuthGuard)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly usersService: UsersService,
  ) {}

  // Run insight engine + return fresh cards
  @Post('refresh')
  async refresh(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.insightsService.refreshAndGetInsights(profile.id);
  }

  // Get active (non-expired) insights without re-running engine
  @Get()
  async getInsights(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.insightsService.getActiveInsights(profile.id);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    const count = await this.insightsService.getUnreadCount(profile.id);
    return { count };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') insightId: string,
    @CurrentUser() user: { uid: string },
  ) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    await this.insightsService.markRead(insightId, profile.id);
    return { success: true };
  }
}
