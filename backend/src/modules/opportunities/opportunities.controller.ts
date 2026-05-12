import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserGoal } from '../../entities/preference.entity';

@Controller('opportunities')
@UseGuards(BetterAuthGuard)
export class OpportunitiesController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly usersService: UsersService,
  ) {}

  // Returns up to 3 "Cerebral Picks" — money-optimization moves derived from
  // the user's account balances and the percentage split for their goal.
  @Get()
  async getPicks(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const prefs   = await this.usersService.getPreferences(profile.id);
    return this.opportunitiesService.getPicks(profile.id, prefs?.goal as UserGoal | undefined);
  }
}
