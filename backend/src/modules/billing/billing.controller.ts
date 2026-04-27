import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsEnum, IsString, IsUrl } from 'class-validator';
import { BillingService, PLANS } from './billing.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

class CreateCheckoutDto {
  @IsEnum(Object.keys(PLANS))
  plan: keyof typeof PLANS;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}

class CreatePortalDto {
  @IsString()
  customerId: string;

  @IsUrl()
  returnUrl: string;
}

@Controller('billing')
@UseGuards(BetterAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly usersService: UsersService,
  ) {}

  @Post('checkout')
  async checkout(
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billing.createCheckoutSession(dto.plan, user.email, dto.successUrl, dto.cancelUrl);
  }

  @Post('portal')
  async portal(@Body() dto: CreatePortalDto) {
    return this.billing.createPortalSession(dto.customerId, dto.returnUrl);
  }

  @Post('status')
  status() {
    return { configured: this.billing.isConfigured(), plans: PLANS };
  }
}
