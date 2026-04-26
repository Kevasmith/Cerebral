import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { UsersService } from './users.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDto, UpdatePreferencesDto, UpdateProfileDto } from './dto/onboarding.dto';

class PushTokenDto {
  @IsString()
  @MaxLength(200)
  expoPushToken: string;
}

@Controller('users')
@UseGuards(BetterAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @CurrentUser() user: { id: string; email: string; name?: string },
    @Body() dto: RegisterDto,
  ) {
    return this.usersService.upsert(user.id, {
      email: dto.email ?? user.email,
      displayName: dto.displayName ?? user.name,
      location: dto.location,
    });
  }

  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findByBetterAuthId(user.id);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Get('me/preferences')
  async getPreferences(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.usersService.getPreferences(profile.id);
  }

  @Patch('me/push-token')
  async savePushToken(
    @CurrentUser() user: { id: string },
    @Body() body: PushTokenDto,
  ) {
    await this.usersService.savePushToken(user.id, body.expoPushToken);
    return { ok: true };
  }

  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() user: { id: string; email: string; name?: string },
    @Body() dto: UpdatePreferencesDto,
  ) {
    let profile;
    try {
      profile = await this.usersService.findByBetterAuthId(user.id);
    } catch {
      // User exists in Better Auth but not in our DB (e.g. first sign-in after failed register)
      profile = await this.usersService.upsert(user.id, {
        email: user.email,
        displayName: user.name,
      });
    }
    return this.usersService.updatePreferences(profile.id, dto);
  }
}
