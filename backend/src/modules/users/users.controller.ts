import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { UsersService } from './users.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RegisterDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './dto/onboarding.dto';
import { posthog } from '../../posthog';

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
    const profile = await this.usersService.upsert(user.id, {
      email: dto.email ?? user.email,
      displayName: dto.displayName ?? user.name,
      location: dto.location,
    });
    posthog.identify({
      distinctId: user.id,
      properties: {
        $set: {
          email: dto.email ?? user.email,
          name: dto.displayName ?? user.name,
          location: dto.location,
        },
        $set_once: { first_registered_at: new Date().toISOString() },
      },
    });
    posthog.capture({
      distinctId: user.id,
      event: 'user_registered',
      properties: { email: dto.email ?? user.email, location: dto.location },
    });
    return profile;
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
    const result = await this.usersService.updateProfile(user.id, body);
    posthog.capture({
      distinctId: user.id,
      event: 'user_profile_updated',
      properties: { updated_fields: Object.keys(body) },
    });
    return result;
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

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    await this.usersService.deleteAccount(user.id);
    posthog.capture({ distinctId: user.id, event: 'account_deleted' });
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
    const result = await this.usersService.updatePreferences(profile.id, dto);
    posthog.capture({
      distinctId: user.id,
      event: 'user_preferences_updated',
      properties: { goal: dto.goal, updated_fields: Object.keys(dto) },
    });
    return result;
  }
}
