import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe = require('stripe');
import { Subscription } from '../../entities/subscription.entity';

export const PLANS = {
  growth: {
    name: 'Growth',
    price: 900,
    interval: 'month' as const,
    features: ['Unlimited accounts', 'AI assistant', 'Advanced insights', 'Priority alerts'],
    priceId: process.env.STRIPE_GROWTH_PRICE_ID ?? '',
  },
  pro: {
    name: 'Pro',
    price: 1900,
    interval: 'month' as const,
    features: ['Everything in Growth', 'Predictive insights', 'Premium recommendations', 'Priority support'],
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
  },
} as const;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: any;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key, { apiVersion: '2026-04-22.dahlia' }) : null;
    if (!key) this.logger.warn('STRIPE_SECRET_KEY not set — billing is disabled');
  }

  async createCheckoutSession(
    plan: keyof typeof PLANS,
    userId: string,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing not configured');

    const { priceId } = PLANS[plan];
    if (!priceId) throw new BadRequestException(`Price ID not configured for plan: ${plan}`);

    const existing = await this.subscriptions.findOne({ where: { userId } });

    const sessionOptions: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { plan, userId },
    };

    if (existing?.stripeCustomerId) {
      sessionOptions.customer = existing.stripeCustomerId;
    } else {
      sessionOptions.customer_email = userEmail;
    }

    const session = await this.stripe.checkout.sessions.create(sessionOptions);
    return { url: session.url };
  }

  async createPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing not configured');
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub?.stripeCustomerId) throw new BadRequestException('No active subscription found');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async getSubscription(userId: string): Promise<{ plan: string; status: string; currentPeriodEnd: Date | null }> {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub) return { plan: 'free', status: 'active', currentPeriodEnd: null };
    return { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !this.stripe) {
      this.logger.warn('Webhook received but Stripe is not fully configured');
      return;
    }

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }
  }

  private async onCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed missing userId in metadata');
      return;
    }

    const planKey = (session.metadata?.plan ?? 'growth') as string;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    let currentPeriodEnd: Date | null = null;
    if (stripeSubscriptionId && this.stripe) {
      const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null;
    }

    await this.subscriptions.upsert(
      { userId, stripeCustomerId, stripeSubscriptionId, plan: planKey, status: 'active', currentPeriodEnd },
      ['userId'],
    );
  }

  private async onSubscriptionUpdated(stripeSub: any): Promise<void> {
    const stripeCustomerId = stripeSub.customer as string;
    const sub = await this.subscriptions.findOne({ where: { stripeCustomerId } });
    if (!sub) return;

    const priceId = stripeSub.items?.data?.[0]?.price?.id ?? '';
    const plan = this.priceIdToPlan(priceId);
    const currentPeriodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;

    await this.subscriptions.update(sub.id, {
      plan,
      status: stripeSub.status,
      stripeSubscriptionId: stripeSub.id,
      currentPeriodEnd,
    });
  }

  private async onSubscriptionDeleted(stripeSub: any): Promise<void> {
    const stripeCustomerId = stripeSub.customer as string;
    const sub = await this.subscriptions.findOne({ where: { stripeCustomerId } });
    if (!sub) return;
    await this.subscriptions.save({
      ...sub,
      plan: 'free',
      status: 'canceled',
      stripeSubscriptionId: null as any,
      currentPeriodEnd: null,
    });
  }

  private priceIdToPlan(priceId: string): string {
    if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) return 'growth';
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
    return 'free';
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }
}
