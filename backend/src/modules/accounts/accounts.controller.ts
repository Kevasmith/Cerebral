import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AccountsService } from './accounts.service';
import { UsersService } from '../users/users.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SyncBankDto {
  @IsString()
  loginId: string;
}

const FLINKS_REDIRECT_URL = 'https://cerebral.app/bank-connected';

@Controller('accounts')
@UseGuards(FirebaseAuthGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getUserAccounts(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.accountsService.findAllByUser(profile.id);
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { uid: string }) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.accountsService.getDashboardSnapshot(profile.id);
  }

  @Get('connect-url')
  getConnectUrl() {
    return { url: this.accountsService.getConnectUrl(FLINKS_REDIRECT_URL) };
  }

  // 5 bank syncs per minute per IP — Flinks is slow and expensive
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  @Post('sync')
  async syncBank(
    @CurrentUser() user: { uid: string },
    @Body() body: SyncBankDto,
  ) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return this.accountsService.syncFromLoginId(profile.id, body.loginId);
  }
}
