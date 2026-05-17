import { BankProviderRouter } from './bank-provider.router';

// Minimal provider stubs — only the `id` field is needed for assertions.
const mockFlinks = { id: 'flinks' as const };
const mockPlaid  = { id: 'plaid'  as const };
const mockConfig = { get: jest.fn() };

function makeRouter(providerEnv: string | undefined = 'plaid') {
  mockConfig.get.mockReturnValue(providerEnv);
  return new BankProviderRouter(mockFlinks as any, mockPlaid as any, mockConfig as any);
}

describe('BankProviderRouter', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── constructor / activeProvider resolution ────────────────────────────────

  describe('active provider selection', () => {
    it('defaults to plaid when BANK_PROVIDER is not set (undefined)', () => {
      const router = makeRouter(undefined);
      expect(router.getActiveProviderId()).toBe('plaid');
    });

    it('selects plaid when BANK_PROVIDER=plaid', () => {
      const router = makeRouter('plaid');
      expect(router.getActiveProviderId()).toBe('plaid');
    });

    it('selects flinks when BANK_PROVIDER=flinks', () => {
      const router = makeRouter('flinks');
      expect(router.getActiveProviderId()).toBe('flinks');
    });

    it('is case-insensitive — PLAID maps to plaid', () => {
      const router = makeRouter('PLAID');
      expect(router.getActiveProviderId()).toBe('plaid');
    });

    it('is case-insensitive — FLINKS maps to flinks', () => {
      const router = makeRouter('FLINKS');
      expect(router.getActiveProviderId()).toBe('flinks');
    });

    it('falls back to plaid for an unrecognised value', () => {
      const router = makeRouter('stripe');
      expect(router.getActiveProviderId()).toBe('plaid');
    });
  });

  // ── forNewConnection ───────────────────────────────────────────────────────

  describe('forNewConnection', () => {
    it('returns the plaid adapter when active provider is plaid', () => {
      const router = makeRouter('plaid');
      expect(router.forNewConnection()).toBe(mockPlaid);
    });

    it('returns the flinks adapter when active provider is flinks', () => {
      const router = makeRouter('flinks');
      expect(router.forNewConnection()).toBe(mockFlinks);
    });
  });

  // ── forProvider ────────────────────────────────────────────────────────────

  describe('forProvider', () => {
    it('always returns the plaid adapter for id "plaid"', () => {
      // Active provider is flinks, but forProvider('plaid') should still give plaid
      const router = makeRouter('flinks');
      expect(router.forProvider('plaid')).toBe(mockPlaid);
    });

    it('always returns the flinks adapter for id "flinks"', () => {
      // Active provider is plaid, but forProvider('flinks') should still give flinks
      const router = makeRouter('plaid');
      expect(router.forProvider('flinks')).toBe(mockFlinks);
    });

    it('is independent of the active provider setting', () => {
      const routerA = makeRouter('plaid');
      const routerB = makeRouter('flinks');

      expect(routerA.forProvider('flinks')).toBe(mockFlinks);
      expect(routerB.forProvider('plaid')).toBe(mockPlaid);
    });
  });

  // ── getActiveProviderId ────────────────────────────────────────────────────

  describe('getActiveProviderId', () => {
    it('exposes the resolved provider id for external validation', () => {
      expect(makeRouter('plaid').getActiveProviderId()).toBe('plaid');
      expect(makeRouter('flinks').getActiveProviderId()).toBe('flinks');
    });
  });
});
