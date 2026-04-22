import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AccountsService } from './accounts.service';
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
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async getUserAccounts(@CurrentUser() user: { uid: string }) {
    return this.accountsService.findAllByUser(user.uid);
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { uid: string }) {
    return this.accountsService.getDashboardSnapshot(user.uid);
  }

  @Get('connect-url')
  getConnectUrl() {
    return { url: this.accountsService.getConnectUrl(FLINKS_REDIRECT_URL) };
  }

  @Post('sync')
  async syncBank(
    @CurrentUser() user: { uid: string },
    @Body() body: SyncBankDto,
  ) {
    return this.accountsService.syncFromLoginId(user.uid, body.loginId);
  }
}
