import { PlaidAdapter } from './plaid.adapter';

// ── mock PlaidService ─────────────────────────────────────────────────────────

const mockPlaid = {
  createLinkToken:    jest.fn(),
  exchangePublicToken: jest.fn(),
  getAccounts:        jest.fn(),
  syncTransactions:   jest.fn(),
};

function makeAdapter() {
  return new PlaidAdapter(mockPlaid as any);
}

// ── raw Plaid account helper ──────────────────────────────────────────────────

function rawAccount(overrides: Record<string, any> = {}): any {
  return {
    accountId:    'acct-1',
    officialName: 'Official Checking Account',
    name:         'Checking',
    type:         'depository',
    subtype:      'checking',
    balance:      { current: 1000, available: 900, currency: 'CAD' },
    mask:         '1234',
    ...overrides,
  };
}

// ── raw Plaid transaction helper ──────────────────────────────────────────────

function rawTx(overrides: Record<string, any> = {}): any {
  return {
    transactionId: 'tx-1',
    accountId:     'acct-1',
    name:          'Coffee Shop',
    merchantName:  'Starbucks',
    amount:        5.50,           // positive = debit in Plaid's convention
    isoCurrencyCode: 'CAD',
    date:          '2024-06-15',
    pending:       false,
    primaryCategory: 'FOOD_AND_DRINK',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PlaidAdapter', () => {
  let adapter: PlaidAdapter;

  beforeEach(() => {
    adapter = makeAdapter();
    jest.clearAllMocks();
  });

  // ── initConnection ─────────────────────────────────────────────────────────

  describe('initConnection', () => {
    it('returns a link_token init object from PlaidService', async () => {
      mockPlaid.createLinkToken.mockResolvedValue({ linkToken: 'lt-abc' });

      const result = await adapter.initConnection('user-1');

      expect(result).toEqual({ kind: 'link_token', value: 'lt-abc' });
      expect(mockPlaid.createLinkToken).toHaveBeenCalledWith('user-1');
    });
  });

  // ── finalizeConnection ─────────────────────────────────────────────────────

  describe('finalizeConnection', () => {
    it('exchanges the public token and returns accessRef + externalId', async () => {
      mockPlaid.exchangePublicToken.mockResolvedValue({
        accessToken: 'access-tok',
        itemId:      'item-1',
      });

      const result = await adapter.finalizeConnection({
        provider: 'plaid',
        publicToken: 'pub-tok',
      });

      expect(result).toEqual({ accessRef: 'access-tok', externalId: 'item-1' });
    });

    it('throws when the payload is for a different provider', async () => {
      await expect(
        adapter.finalizeConnection({ provider: 'flinks', loginId: 'x' } as any),
      ).rejects.toThrow('PlaidAdapter cannot finalize flinks');
    });
  });

  // ── fetchAccounts ──────────────────────────────────────────────────────────

  describe('fetchAccounts', () => {
    it('prefers officialName over name for institutionName', async () => {
      mockPlaid.getAccounts.mockResolvedValue([
        rawAccount({ officialName: 'TD Chequing', name: 'Fallback' }),
      ]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct.institutionName).toBe('TD Chequing');
    });

    it('falls back to name when officialName is null', async () => {
      mockPlaid.getAccounts.mockResolvedValue([
        rawAccount({ officialName: null, name: 'My Checking' }),
      ]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct.institutionName).toBe('My Checking');
    });

    it('uses empty string when both officialName and name are null', async () => {
      mockPlaid.getAccounts.mockResolvedValue([
        rawAccount({ officialName: null, name: null }),
      ]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct.institutionName).toBe('');
    });

    it('maps balance fields directly', async () => {
      mockPlaid.getAccounts.mockResolvedValue([
        rawAccount({ balance: { current: 500, available: 400, currency: 'USD' } }),
      ]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct.balance).toEqual({ current: 500, available: 400, currency: 'USD' });
    });

    it('sets mask to null when the raw account has no mask', async () => {
      mockPlaid.getAccounts.mockResolvedValue([rawAccount({ mask: undefined })]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct.mask).toBeNull();
    });

    it('maps all NormalizedAccount fields correctly', async () => {
      mockPlaid.getAccounts.mockResolvedValue([rawAccount()]);

      const [acct] = await adapter.fetchAccounts('access-ref');

      expect(acct).toMatchObject({
        externalAccountId: 'acct-1',
        institutionName:   'Official Checking Account',
        accountName:       'Checking',
        accountType:       'checking',
        mask:              '1234',
      });
    });
  });

  // ── mapAccountType ─────────────────────────────────────────────────────────

  describe('mapAccountType (via fetchAccounts)', () => {
    async function getType(type: string, subtype: string | null): Promise<string> {
      mockPlaid.getAccounts.mockResolvedValue([rawAccount({ type, subtype })]);
      const [acct] = await adapter.fetchAccounts('ref');
      return acct.accountType;
    }

    it('maps credit → credit', async () => {
      expect(await getType('credit', null)).toBe('credit');
    });

    it('maps investment → investment', async () => {
      expect(await getType('investment', null)).toBe('investment');
    });

    it('maps brokerage → investment', async () => {
      expect(await getType('brokerage', null)).toBe('investment');
    });

    it('maps loan → credit', async () => {
      expect(await getType('loan', null)).toBe('credit');
    });

    it('maps depository + savings subtype → savings', async () => {
      expect(await getType('depository', 'savings')).toBe('savings');
    });

    it('maps depository + SAVINGS (uppercase) → savings', async () => {
      expect(await getType('depository', 'SAVINGS')).toBe('savings');
    });

    it('maps depository + money market → savings (contains "saving"? no)', async () => {
      // money market does NOT contain "saving", so → checking
      expect(await getType('depository', 'money market')).toBe('checking');
    });

    it('maps depository + checking → checking', async () => {
      expect(await getType('depository', 'checking')).toBe('checking');
    });

    it('defaults unknown top-level type to checking', async () => {
      expect(await getType('other', null)).toBe('checking');
    });
  });

  // ── fetchTransactions ──────────────────────────────────────────────────────

  describe('fetchTransactions', () => {
    it('positive amount → isDebit true, amount unchanged', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [rawTx({ amount: 42.50 })],
        modified: [],
        nextCursor: '',
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].isDebit).toBe(true);
      expect(transactions[0].amount).toBeCloseTo(42.50);
    });

    it('negative amount (credit/refund) → isDebit false, amount is absolute value', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [rawTx({ amount: -25.00 })],
        modified: [],
        nextCursor: '',
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].isDebit).toBe(false);
      expect(transactions[0].amount).toBeCloseTo(25.00);
    });

    it('merges added and modified arrays into a single list', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added:    [rawTx({ transactionId: 'tx-add', amount: 10 })],
        modified: [rawTx({ transactionId: 'tx-mod', amount: 20 })],
        nextCursor: 'cur-next',
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions).toHaveLength(2);
      expect(transactions.map(t => t.externalTransactionId)).toEqual(['tx-add', 'tx-mod']);
    });

    it('forwards the nextCursor from PlaidService', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [], modified: [], nextCursor: 'cursor-xyz',
      });

      const { nextCursor } = await adapter.fetchTransactions('ref');

      expect(nextCursor).toBe('cursor-xyz');
    });

    it('passes opts.cursor to syncTransactions', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [], modified: [], nextCursor: '',
      });

      await adapter.fetchTransactions('ref', { cursor: 'prev-cursor' });

      expect(mockPlaid.syncTransactions).toHaveBeenCalledWith('ref', 'prev-cursor');
    });

    it('maps all NormalizedTransaction fields correctly', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [rawTx()],
        modified: [],
        nextCursor: '',
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0]).toMatchObject({
        externalTransactionId: 'tx-1',
        externalAccountId:     'acct-1',
        description:           'Coffee Shop',
        merchantName:          'Starbucks',
        currency:              'CAD',
        date:                  '2024-06-15',
        pending:               false,
        providerPrimaryCategory: 'FOOD_AND_DRINK',
      });
    });

    it('sets merchantName to null when raw merchantName is absent', async () => {
      mockPlaid.syncTransactions.mockResolvedValue({
        added: [rawTx({ merchantName: undefined })],
        modified: [],
        nextCursor: '',
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].merchantName).toBeNull();
    });
  });
});
