import { Injectable, Logger } from '@nestjs/common';
import Stripe = require('stripe');

export const PLANS = {
  growth: {
    name: 'Growth',
    price: 900,       // cents CAD
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
  private readonly stripe: InstanceType<typeof Stripe> | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key, { apiVersion: '2026-04-22.dahlia' }) : null;
    if (!key) this.logger.warn('STRIPE_SECRET_KEY not set — billing is disabled');
  }

  async createCheckoutSession(
    plan: keyof typeof PLANS,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Billing not configured');

    const { priceId } = PLANS[plan];
    if (!priceId) throw new Error(`Price ID not configured for plan: ${plan}`);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { plan },
    });

    return { url: session.url! };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Billing not configured');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }
}
