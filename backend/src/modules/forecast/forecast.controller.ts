import { Controller, Get, UseGuards } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserGoal } from '../../entities/preference.entity';

@Controller('forecast')
@UseGuards(BetterAuthGuard)
export class ForecastController {
  constructor(
    private readonly forecastService: ForecastService,
    private readonly usersService: UsersService,
  ) {}

  // Returns the user's forward-looking forecast bundle: month-end cash flow
  // projection and goal-timeline math, both derived from live account data.
  @Get()
  async getBundle(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    const prefs   = await this.usersService.getPreferences(profile.id);
    return this.forecastService.getBundle(profile.id, prefs?.goal as UserGoal | undefined);
  }
}
