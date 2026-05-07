// Single source of truth for transaction categories in Cerebral.
//
// Plaid returns its own taxonomy via `personal_finance_category.primary`
// (16 values). This file maps every Plaid primary to a Cerebral category so
// each one is a first-class citizen in the UI (icon, color, label, budget).
//
// The merchant-pattern table in `transactions.service.ts` always wins; this
// map is the *fallback* used when no merchant pattern matches and the
// transaction came from Plaid.
//
// Mirror: `frontend/src/constants/categories.js` carries display metadata
// (label/icon/color/budget). Keep both files in sync when adding categories.
//
// Plaid taxonomy reference:
// https://plaid.com/docs/api/products/transactions/#personal_finance_category-taxonomy

export type CerebralCategory =
  | 'income'
  | 'transfer'
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'travel'
  | 'loans'
  | 'fees'
  | 'home'
  | 'personal_care'
  | 'services'
  | 'government'
  | 'other';

export const CATEGORIES: readonly CerebralCategory[] = [
  'income',
  'transfer',
  'food',
  'transport',
  'entertainment',
  'shopping',
  'bills',
  'health',
  'travel',
  'loans',
  'fees',
  'home',
  'personal_care',
  'services',
  'government',
  'other',
];

// Plaid `personal_finance_category.primary` → Cerebral category.
// All 16 Plaid primary values must be present so categorization never silently
// collapses an unknown primary into 'other'. The accompanying spec asserts
// completeness — fails loud if Plaid adds new primaries.
export const PLAID_PRIMARY_TO_CEREBRAL: Record<string, CerebralCategory> = {
  INCOME:                    'income',
  TRANSFER_IN:               'transfer',
  TRANSFER_OUT:              'transfer',
  LOAN_PAYMENTS:             'loans',
  BANK_FEES:                 'fees',
  ENTERTAINMENT:             'entertainment',
  FOOD_AND_DRINK:            'food',
  GENERAL_MERCHANDISE:       'shopping',
  HOME_IMPROVEMENT:          'home',
  MEDICAL:                   'health',
  PERSONAL_CARE:             'personal_care',
  GENERAL_SERVICES:          'services',
  GOVERNMENT_AND_NON_PROFIT: 'government',
  TRANSPORTATION:            'transport',
  TRAVEL:                    'travel',
  RENT_AND_UTILITIES:        'bills',
};

// All Plaid primary categories we expect — used by the spec to detect drift.
export const PLAID_PRIMARY_KEYS: readonly string[] = Object.freeze(
  Object.keys(PLAID_PRIMARY_TO_CEREBRAL),
);

export function mapPlaidPrimaryToCerebral(
  primary: string | null | undefined,
): CerebralCategory {
  if (!primary) return 'other';
  return PLAID_PRIMARY_TO_CEREBRAL[primary] ?? 'other';
}
