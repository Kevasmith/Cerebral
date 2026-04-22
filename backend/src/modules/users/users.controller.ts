import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDto, UpdatePreferencesDto } from './dto/onboarding.dto';

class PushTokenDto {
  @IsString()
  expoPushToken: string;
}

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Called immediately after Firebase sign-up/sign-in on the client
  @Post('register')
  async register(
    @CurrentUser() user: { uid: string; email: string; name?: string },
    @Body() dto: RegisterDto,
  ) {
    return this.usersService.upsertFromFirebase(user.uid, {
      email: dto.email ?? user.email,
      displayName: dto.displayName ?? user.name,
      location: dto.location,
    });
  }

  @Get('me')
  async getMe(@CurrentUser() user: { uid: string }) {
    return this.usersService.findByFirebaseUid(user.uid);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { uid: string },
    @Body() body: Partial<Pick<RegisterDto, 'displayName' | 'location'>>,
  ) {
    return this.usersService.updateProfile(user.uid, body);
  }

  @Get('me/preferences')
  async getPreferences(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.usersService.getPreferences(profile.id);
  }

  @Patch('me/push-token')
  async savePushToken(
    @CurrentUser() user: { uid: string },
    @Body() body: PushTokenDto,
  ) {
    await this.usersService.savePushToken(user.uid, body.expoPushToken);
    return { ok: true };
  }

  // Onboarding step: save goals + interests + location
  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() user: { uid: string },
    @Body() dto: UpdatePreferencesDto,
  ) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.usersService.updatePreferences(profile.id, dto);
  }
}
