import { FlinksAdapter } from './flinks.adapter';

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockFlinks = {
  getConnectUrl:     jest.fn(),
  authorize:         jest.fn(),
  getAccountsDetail: jest.fn(),
  getTransactions:   jest.fn(),
};

const mockConfig = { get: jest.fn() };

function makeAdapter() {
  return new FlinksAdapter(mockFlinks as any, mockConfig as any);
}

// ── Flinks raw-data helpers ───────────────────────────────────────────────────

function rawFlinksAccount(overrides: Record<string, any> = {}): any {
  return {
    Id:            'acct-flinks-1',
    Title:         'Chequing',
    Type:          'Chequing',
    AccountNumber: '123456789',
    Balance:       { Current: 1500, Available: 1200 },
    Currency:      'CAD',
    ...overrides,
  };
}

function rawFlinksTx(overrides: Record<string, any> = {}): any {
  return {
    Id:          'tx-flinks-1',
    Description: 'Grocery Store',
    Debit:       45.00,
    Credit:      0,
    Currency:    'CAD',
    Date:        '2024-06-15T00:00:00Z',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('FlinksAdapter', () => {
  let adapter: FlinksAdapter;

  beforeEach(() => {
    adapter = makeAdapter();
    jest.clearAllMocks();
    mockFlinks.authorize.mockResolvedValue({ RequestId: 'req-123' });
  });

  // ── initConnection ─────────────────────────────────────────────────────────

  describe('initConnection', () => {
    it('uses opts.redirectUrl when provided', async () => {
      mockFlinks.getConnectUrl.mockReturnValue('https://custom/connect');

      const result = await adapter.initConnection('user-1', {
        redirectUrl: 'https://custom/redirect',
      });

      expect(mockFlinks.getConnectUrl).toHaveBeenCalledWith('https://custom/redirect');
      expect(result).toEqual({ kind: 'iframe_url', value: 'https://custom/connect' });
    });

    it('falls back to FLINKS_REDIRECT_URL from config when no opt is given', async () => {
      mockConfig.get.mockReturnValue('https://config/redirect');
      mockFlinks.getConnectUrl.mockReturnValue('https://config/connect');

      const result = await adapter.initConnection('user-1');

      expect(mockFlinks.getConnectUrl).toHaveBeenCalledWith('https://config/redirect');
      expect(result.kind).toBe('iframe_url');
    });

    it('falls back to the default URL when config has no FLINKS_REDIRECT_URL', async () => {
      mockConfig.get.mockReturnValue(undefined);
      mockFlinks.getConnectUrl.mockReturnValue('https://cerebral.app/bank-connected');

      await adapter.initConnection('user-1');

      expect(mockFlinks.getConnectUrl).toHaveBeenCalledWith(
        'https://cerebral.app/bank-connected',
      );
    });

    it('opts.redirectUrl takes precedence over config value', async () => {
      mockConfig.get.mockReturnValue('https://config/redirect');
      mockFlinks.getConnectUrl.mockReturnValue('whatever');

      await adapter.initConnection('user-1', { redirectUrl: 'https://opts/redirect' });

      expect(mockFlinks.getConnectUrl).toHaveBeenCalledWith('https://opts/redirect');
    });
  });

  // ── finalizeConnection ─────────────────────────────────────────────────────

  describe('finalizeConnection', () => {
    it('returns loginId as both accessRef and externalId', async () => {
      const result = await adapter.finalizeConnection({
        provider: 'flinks',
        loginId:  'login-abc',
      });

      expect(result).toEqual({ accessRef: 'login-abc', externalId: 'login-abc' });
    });

    it('throws when the payload is for a different provider', async () => {
      await expect(
        adapter.finalizeConnection({ provider: 'plaid', publicToken: 'x' } as any),
      ).rejects.toThrow('FlinksAdapter cannot finalize plaid');
    });
  });

  // ── fetchAccounts ──────────────────────────────────────────────────────────

  describe('fetchAccounts', () => {
    beforeEach(() => {
      mockFlinks.getAccountsDetail.mockResolvedValue({
        Login:    { InstitutionName: 'TD Bank' },
        Accounts: [rawFlinksAccount()],
      });
    });

    it('calls authorize then getAccountsDetail with the RequestId', async () => {
      await adapter.fetchAccounts('login-ref');

      expect(mockFlinks.authorize).toHaveBeenCalledWith('login-ref');
      expect(mockFlinks.getAccountsDetail).toHaveBeenCalledWith('req-123');
    });

    it('uses InstitutionName from the Login section', async () => {
      const [acct] = await adapter.fetchAccounts('login-ref');

      expect(acct.institutionName).toBe('TD Bank');
    });

    it('falls back to empty string when Login.InstitutionName is absent', async () => {
      mockFlinks.getAccountsDetail.mockResolvedValue({
        Login:    undefined,
        Accounts: [rawFlinksAccount()],
      });

      const [acct] = await adapter.fetchAccounts('login-ref');

      expect(acct.institutionName).toBe('');
    });

    it('uses last-4 digits of AccountNumber as mask', async () => {
      const [acct] = await adapter.fetchAccounts('login-ref');

      expect(acct.mask).toBe('6789');
    });

    it('maps all NormalizedAccount fields correctly', async () => {
      const [acct] = await adapter.fetchAccounts('login-ref');

      expect(acct).toMatchObject({
        externalAccountId: 'acct-flinks-1',
        institutionName:   'TD Bank',
        accountName:       'Chequing',
        accountType:       'checking',
        balance: { current: 1500, available: 1200, currency: 'CAD' },
        mask:    '6789',
      });
    });
  });

  // ── mapAccountType (via fetchAccounts) ────────────────────────────────────

  describe('mapAccountType', () => {
    async function getType(flinksType: string): Promise<string> {
      mockFlinks.getAccountsDetail.mockResolvedValue({
        Login:    {},
        Accounts: [rawFlinksAccount({ Type: flinksType })],
      });
      const [acct] = await adapter.fetchAccounts('ref');
      return acct.accountType;
    }

    it('maps Savings → savings (contains "saving")', async () => {
      expect(await getType('Savings')).toBe('savings');
    });

    it('maps SAVINGS (uppercase) → savings', async () => {
      expect(await getType('SAVINGS')).toBe('savings');
    });

    it('maps Credit → credit', async () => {
      expect(await getType('Credit')).toBe('credit');
    });

    it('maps CreditCard → credit', async () => {
      expect(await getType('CreditCard')).toBe('credit');
    });

    it('maps Investment → investment', async () => {
      expect(await getType('Investment')).toBe('investment');
    });

    it('maps Chequing → checking (default)', async () => {
      expect(await getType('Chequing')).toBe('checking');
    });

    it('maps undefined type → checking (default)', async () => {
      expect(await getType(undefined as any)).toBe('checking');
    });
  });

  // ── maskFromAccountNumber (via fetchAccounts) ─────────────────────────────

  describe('maskFromAccountNumber', () => {
    async function getMask(accountNumber: string | undefined): Promise<string | null> {
      mockFlinks.getAccountsDetail.mockResolvedValue({
        Login:    {},
        Accounts: [rawFlinksAccount({ AccountNumber: accountNumber })],
      });
      const [acct] = await adapter.fetchAccounts('ref');
      return acct.mask;
    }

    it('returns last 4 digits for a long account number', async () => {
      expect(await getMask('123456789')).toBe('6789');
    });

    it('returns the full number when it is 4 digits or fewer', async () => {
      expect(await getMask('1234')).toBe('1234');
      expect(await getMask('12')).toBe('12');
    });

    it('returns null for undefined account number', async () => {
      expect(await getMask(undefined)).toBeNull();
    });

    it('returns null for empty string account number', async () => {
      expect(await getMask('')).toBeNull();
    });
  });

  // ── fetchTransactions ──────────────────────────────────────────────────────

  describe('fetchTransactions', () => {
    beforeEach(() => {
      mockFlinks.getTransactions.mockResolvedValue({
        Accounts: [
          { Id: 'acct-flinks-1', Transactions: [rawFlinksTx()] },
        ],
      });
    });

    it('calls authorize then getTransactions with the RequestId', async () => {
      await adapter.fetchTransactions('login-ref');

      expect(mockFlinks.authorize).toHaveBeenCalledWith('login-ref');
      expect(mockFlinks.getTransactions).toHaveBeenCalledWith('req-123', {
        fromDate: undefined,
        toDate:   undefined,
      });
    });

    it('debit transaction (Debit > 0): isDebit=true, amount=Debit', async () => {
      mockFlinks.getTransactions.mockResolvedValue({
        Accounts: [{ Id: 'acct-1', Transactions: [rawFlinksTx({ Debit: 50, Credit: 0 })] }],
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].isDebit).toBe(true);
      expect(transactions[0].amount).toBeCloseTo(50);
    });

    it('credit transaction (Debit = 0, Credit > 0): isDebit=false, amount=Credit', async () => {
      mockFlinks.getTransactions.mockResolvedValue({
        Accounts: [{ Id: 'acct-1', Transactions: [rawFlinksTx({ Debit: 0, Credit: 200 })] }],
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].isDebit).toBe(false);
      expect(transactions[0].amount).toBeCloseTo(200);
    });

    it('sets merchantName, pending, and providerPrimaryCategory to their Flinks defaults', async () => {
      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].merchantName).toBeNull();
      expect(transactions[0].pending).toBe(false);
      expect(transactions[0].providerPrimaryCategory).toBeNull();
    });

    it('normalizes ISO date string to YYYY-MM-DD', async () => {
      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].date).toBe('2024-06-15');
    });

    it('flattens transactions across multiple accounts', async () => {
      mockFlinks.getTransactions.mockResolvedValue({
        Accounts: [
          { Id: 'acct-1', Transactions: [rawFlinksTx({ Id: 'tx-a' })] },
          { Id: 'acct-2', Transactions: [rawFlinksTx({ Id: 'tx-b' })] },
        ],
      });

      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions).toHaveLength(2);
      expect(transactions.map(t => t.externalTransactionId)).toEqual(['tx-a', 'tx-b']);
    });

    it('assigns the parent account Id as externalAccountId', async () => {
      const { transactions } = await adapter.fetchTransactions('ref');

      expect(transactions[0].externalAccountId).toBe('acct-flinks-1');
    });

    it('returns no nextCursor (Flinks does not support cursor sync)', async () => {
      const { nextCursor } = await adapter.fetchTransactions('ref');

      expect(nextCursor).toBeUndefined();
    });

    it('passes fromDate and toDate options to getTransactions', async () => {
      await adapter.fetchTransactions('ref', { fromDate: '2024-01-01', toDate: '2024-01-31' });

      expect(mockFlinks.getTransactions).toHaveBeenCalledWith('req-123', {
        fromDate: '2024-01-01',
        toDate:   '2024-01-31',
      });
    });
  });

  // ── normalizeDate (via fetchTransactions) ─────────────────────────────────

  describe('normalizeDate', () => {
    async function getDate(raw: string): Promise<string> {
      mockFlinks.getTransactions.mockResolvedValue({
        Accounts: [{ Id: 'a', Transactions: [rawFlinksTx({ Date: raw })] }],
      });
      const { transactions } = await adapter.fetchTransactions('ref');
      return transactions[0].date;
    }

    it('slices a full ISO timestamp to YYYY-MM-DD', async () => {
      expect(await getDate('2024-06-15T12:34:56Z')).toBe('2024-06-15');
    });

    it('returns a date string that is exactly 10 chars unchanged', async () => {
      expect(await getDate('2024-06-15')).toBe('2024-06-15');
    });

    it('returns short strings (< 10 chars) as-is', async () => {
      expect(await getDate('2024-06')).toBe('2024-06');
    });

    it('returns empty string for empty input', async () => {
      expect(await getDate('')).toBe('');
    });
  });
});
