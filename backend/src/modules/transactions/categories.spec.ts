import {
  mapPlaidPrimaryToCerebral,
  PLAID_PRIMARY_TO_CEREBRAL,
  PLAID_PRIMARY_KEYS,
  CATEGORIES,
} from './categories';

describe('mapPlaidPrimaryToCerebral', () => {
  it.each([
    ['INCOME',                    'income'],
    ['TRANSFER_IN',               'transfer'],
    ['TRANSFER_OUT',              'transfer'],
    ['LOAN_PAYMENTS',             'loans'],
    ['BANK_FEES',                 'fees'],
    ['ENTERTAINMENT',             'entertainment'],
    ['FOOD_AND_DRINK',            'food'],
    ['GENERAL_MERCHANDISE',       'shopping'],
    ['HOME_IMPROVEMENT',          'home'],
    ['MEDICAL',                   'health'],
    ['PERSONAL_CARE',             'personal_care'],
    ['GENERAL_SERVICES',          'services'],
    ['GOVERNMENT_AND_NON_PROFIT', 'government'],
    ['TRANSPORTATION',            'transport'],
    ['TRAVEL',                    'travel'],
    ['RENT_AND_UTILITIES',        'bills'],
  ])('maps Plaid primary %s → %s', (plaidPrimary, expected) => {
    expect(mapPlaidPrimaryToCerebral(plaidPrimary)).toBe(expected);
  });

  it('returns other for null', () => {
    expect(mapPlaidPrimaryToCerebral(null)).toBe('other');
  });

  it('returns other for undefined', () => {
    expect(mapPlaidPrimaryToCerebral(undefined)).toBe('other');
  });

  it('returns other for an unknown future Plaid category', () => {
    expect(mapPlaidPrimaryToCerebral('CRYPTO_ASSETS')).toBe('other');
  });

  it('is case-sensitive — lowercase does not match', () => {
    expect(mapPlaidPrimaryToCerebral('income')).toBe('other');
  });
});

describe('PLAID_PRIMARY_KEYS completeness', () => {
  it('mirrors every key in PLAID_PRIMARY_TO_CEREBRAL', () => {
    expect([...PLAID_PRIMARY_KEYS]).toEqual(Object.keys(PLAID_PRIMARY_TO_CEREBRAL));
  });

  it('covers all 16 Plaid primary categories', () => {
    expect(PLAID_PRIMARY_KEYS).toHaveLength(16);
  });
});

describe('CATEGORIES', () => {
  it('includes all Cerebral category values used in PLAID_PRIMARY_TO_CEREBRAL', () => {
    const mapped = new Set(Object.values(PLAID_PRIMARY_TO_CEREBRAL));
    for (const cat of mapped) {
      expect(CATEGORIES).toContain(cat);
    }
  });
});
