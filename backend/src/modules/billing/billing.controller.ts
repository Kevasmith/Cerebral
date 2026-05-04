import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsEnum, IsUrl } from 'class-validator';
import { Request } from 'express';
import { BillingService, PLANS } from './billing.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { posthog } from '../../posthog';

class CreateCheckoutDto {
  @IsEnum(Object.keys(PLANS))
  plan: keyof typeof PLANS;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}

class CreatePortalDto {
  @IsUrl()
  returnUrl: string;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @UseGuards(BetterAuthGuard)
  async checkout(
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: CreateCheckoutDto,
  ) {
    const result = await this.billing.createCheckoutSession(
      dto.plan,
      user.id,
      user.email,
      dto.successUrl,
      dto.cancelUrl,
    );
    posthog.capture({
      distinctId: user.id,
      event: 'checkout_initiated',
      properties: { plan: dto.plan },
    });
    return result;
  }

  @Post('portal')
  @UseGuards(BetterAuthGuard)
  async portal(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePortalDto,
  ) {
    const result = await this.billing.createPortalSession(
      user.id,
      dto.returnUrl,
    );
    posthog.capture({ distinctId: user.id, event: 'billing_portal_opened' });
    return result;
  }

  @Get('subscription')
  @UseGuards(BetterAuthGuard)
  async subscription(@CurrentUser() user: { id: string }) {
    return this.billing.getSubscription(user.id);
  }

  // Stripe calls this directly — no auth guard, needs raw body for signature verification
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    await this.billing.handleWebhook(req.rawBody!, signature);
  }

  @Get('status')
  @UseGuards(BetterAuthGuard)
  status() {
    return { configured: this.billing.isConfigured(), plans: PLANS };
  }
}
