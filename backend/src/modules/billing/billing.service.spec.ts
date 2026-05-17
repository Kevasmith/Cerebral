import { BadRequestException } from '@nestjs/common';
import { BillingService, PLANS } from './billing.service';

// PLANS reads priceId from env at module-load time; patch the object directly.
beforeAll(() => {
  (PLANS.growth as any).priceId = 'price_growth_test';
  (PLANS.pro    as any).priceId = 'price_pro_test';
});

jest.mock('../../posthog', () => ({
  posthog: { capture: jest.fn() },
}));

const mockSubscriptions = {
  findOne: jest.fn(),
  upsert:  jest.fn().mockResolvedValue(undefined),
  update:  jest.fn().mockResolvedValue(undefined),
  save:    jest.fn().mockResolvedValue(undefined),
};

const mockStripe = {
  checkout: {
    sessions: { create: jest.fn() },
  },
  billingPortal: {
    sessions: { create: jest.fn() },
  },
  subscriptions: { retrieve: jest.fn() },
  webhooks:      { constructEvent: jest.fn() },
};

function makeService() {
  // Avoid real Stripe instantiation; inject the mock after construction.
  delete process.env.STRIPE_SECRET_KEY;
  const svc = new BillingService(mockSubscriptions as any);
  (svc as any).stripe = mockStripe;
  return svc;
}

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  // ─── getSubscription ────────────────────────────────────────────────────────

  describe('getSubscription', () => {
    it('returns free/active when no subscription row exists', async () => {
      mockSubscriptions.findOne.mockResolvedValue(null);

      const result = await service.getSubscription('user-1');

      expect(result).toEqual({ plan: 'free', status: 'active', currentPeriodEnd: null });
    });

    it('returns the plan and status from the database row', async () => {
      const periodEnd = new Date('2025-12-31');
      mockSubscriptions.findOne.mockResolvedValue({
        plan: 'growth',
        status: 'active',
        currentPeriodEnd: periodEnd,
      });

      const result = await service.getSubscription('user-1');

      expect(result).toEqual({ plan: 'growth', status: 'active', currentPeriodEnd: periodEnd });
    });
  });

  // ─── isConfigured ───────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('returns true when stripe is injected', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when stripe is null', () => {
      (service as any).stripe = null;
      expect(service.isConfigured()).toBe(false);
    });
  });

  // ─── createCheckoutSession ──────────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    it('throws BadRequestException when the plan price ID is not configured', async () => {
      const saved = (PLANS.growth as any).priceId;
      (PLANS.growth as any).priceId = '';
      try {
        await expect(
          service.createCheckoutSession('growth', 'user-1', 'user@example.com', 'https://ok', 'https://cancel'),
        ).rejects.toThrow(BadRequestException);
      } finally {
        (PLANS.growth as any).priceId = saved;
      }
    });

    it('uses the existing stripeCustomerId when a subscription row exists', async () => {
      mockSubscriptions.findOne.mockResolvedValue({ stripeCustomerId: 'cus_existing' });
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/1' });

      await service.createCheckoutSession('growth', 'user-1', 'user@test.com', 'https://ok', 'https://cancel');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_existing' }),
      );
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ customer_email: expect.anything() }),
      );
    });

    it('uses customer_email when no existing subscription', async () => {
      mockSubscriptions.findOne.mockResolvedValue(null);
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/2' });

      await service.createCheckoutSession('pro', 'user-2', 'new@test.com', 'https://ok', 'https://cancel');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer_email: 'new@test.com' }),
      );
    });

    it('returns the checkout session URL', async () => {
      mockSubscriptions.findOne.mockResolvedValue(null);
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/3' });

      const result = await service.createCheckoutSession('growth', 'u', 'u@t.com', 'https://ok', 'https://cancel');

      expect(result).toEqual({ url: 'https://checkout.stripe.com/3' });
    });
  });

  // ─── handleWebhook ──────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('throws BadRequestException when the Stripe signature is invalid', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await expect(
        service.handleWebhook(Buffer.from('payload'), 'bad-sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts the subscription and sets status to active on checkout.session.completed', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 86400;
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata:     { userId: 'user-1', plan: 'growth' },
            customer:     'cus_new',
            subscription: 'sub_abc',
          },
        },
      });
      mockStripe.subscriptions.retrieve.mockResolvedValue({ current_period_end: periodEnd });

      await service.handleWebhook(Buffer.from('payload'), 'valid-sig');

      expect(mockSubscriptions.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          plan:   'growth',
          status: 'active',
          stripeCustomerId: 'cus_new',
        }),
        ['userId'],
      );
    });

    it('sets plan to free and status to canceled on subscription.deleted', async () => {
      const sub = { id: 'local-sub-1', userId: 'user-2', plan: 'growth', status: 'active', stripeCustomerId: 'cus_del' };
      mockSubscriptions.findOne.mockResolvedValue(sub);
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_del',
            id:       'sub_del',
            status:   'canceled',
            current_period_end: null,
            items:    { data: [] },
          },
        },
      });

      await service.handleWebhook(Buffer.from('payload'), 'valid-sig');

      expect(mockSubscriptions.save).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'free', status: 'canceled' }),
      );
    });

    it('returns early without throwing when webhook secret is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        service.handleWebhook(Buffer.from('payload'), 'any-sig'),
      ).resolves.toBeUndefined();

      expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('ignores unknown event types without throwing', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: {} },
      });

      await expect(
        service.handleWebhook(Buffer.from('payload'), 'valid-sig'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── PLANS constant ─────────────────────────────────────────────────────────

  describe('PLANS', () => {
    it('growth plan has a price of 900 cents', () => {
      expect(PLANS.growth.price).toBe(900);
    });

    it('pro plan has a price of 1900 cents', () => {
      expect(PLANS.pro.price).toBe(1900);
    });

    it('both plans have a monthly interval', () => {
      expect(PLANS.growth.interval).toBe('month');
      expect(PLANS.pro.interval).toBe('month');
    });
  });
});
