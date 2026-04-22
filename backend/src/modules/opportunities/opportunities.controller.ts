import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserInterest } from '../../entities/preference.entity';

@Controller('opportunities')
@UseGuards(FirebaseAuthGuard)
export class OpportunitiesController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getFeed(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    const prefs = await this.usersService.getPreferences(profile.id);

    return this.opportunitiesService.getFeed(
      (prefs.interests ?? []) as UserInterest[],
      prefs.location ?? profile.location ?? undefined,
    );
  }
}
