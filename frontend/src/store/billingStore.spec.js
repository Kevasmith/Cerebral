jest.mock('../api/client', () => ({
  api: { get: jest.fn() },
}));

const { api } = require('../api/client');
const useBillingStore = require('./billingStore').default;

// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  plan: 'free', status: 'active', currentPeriodEnd: null, loaded: false,
};

function store() { return useBillingStore.getState(); }

describe('billingStore', () => {
  beforeEach(() => {
    useBillingStore.setState(INITIAL_STATE); // merge mode preserves store action functions
    jest.clearAllMocks();
  });

  // ── fetch ──────────────────────────────────────────────────────────────────

  describe('fetch', () => {
    it('spreads the API response into state and sets loaded=true', async () => {
      api.get.mockResolvedValue({
        data: { plan: 'growth', status: 'active', currentPeriodEnd: '2025-01-01' },
      });

      await store().fetch();

      expect(store().plan).toBe('growth');
      expect(store().status).toBe('active');
      expect(store().currentPeriodEnd).toBe('2025-01-01');
      expect(store().loaded).toBe(true);
    });

    it('sets loaded=true even when the API call fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await store().fetch();

      expect(store().loaded).toBe(true);
      expect(store().plan).toBe('free'); // unchanged
    });

    it('calls GET /billing/subscription', async () => {
      api.get.mockResolvedValue({ data: {} });

      await store().fetch();

      expect(api.get).toHaveBeenCalledWith('/billing/subscription');
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('restores all defaults', () => {
      useBillingStore.setState({ plan: 'pro', status: 'canceled', loaded: true });

      store().reset();

      expect(store()).toMatchObject(INITIAL_STATE);
    });
  });

  // ── isPaid ─────────────────────────────────────────────────────────────────

  describe('isPaid', () => {
    it('returns false for the free plan', () => {
      expect(store().isPaid()).toBe(false);
    });

    it('returns true for the growth plan', () => {
      useBillingStore.setState({ plan: 'growth' });
      expect(store().isPaid()).toBe(true);
    });

    it('returns true for the pro plan', () => {
      useBillingStore.setState({ plan: 'pro' });
      expect(store().isPaid()).toBe(true);
    });
  });

  // ── isPro ──────────────────────────────────────────────────────────────────

  describe('isPro', () => {
    it('returns false for the free plan', () => {
      expect(store().isPro()).toBe(false);
    });

    it('returns false for the growth plan', () => {
      useBillingStore.setState({ plan: 'growth' });
      expect(store().isPro()).toBe(false);
    });

    it('returns true for the pro plan', () => {
      useBillingStore.setState({ plan: 'pro' });
      expect(store().isPro()).toBe(true);
    });
  });
});
