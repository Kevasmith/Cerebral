import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AccountsService } from './accounts.service';
import { UsersService } from '../users/users.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class SyncBankDto {
  @IsString()
  @MaxLength(200)
  loginId: string;
}

const FLINKS_REDIRECT_URL = 'https://cerebral.app/bank-connected';

@Controller('accounts')
@UseGuards(BetterAuthGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getUserAccounts(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.accountsService.findAllByUser(profile.id);
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
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
    @CurrentUser() user: { id: string },
    @Body() body: SyncBankDto,
  ) {
    const profile = await this.usersService.findByBetterAuthId(user.id);
    return this.accountsService.syncFromLoginId(profile.id, body.loginId);
  }
}
