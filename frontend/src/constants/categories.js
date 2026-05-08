// Display metadata for the 16 Cerebral categories.
// Mirror of `backend/src/modules/transactions/categories.ts` — keep keys in sync.
// Each entry: { label, icon (Ionicons), color, colorDim, budget }.

export const CATEGORIES = {
  income:        { label: 'Income',         icon: 'cash-outline',             color: '#22C55E', colorDim: 'rgba(34,197,94,0.15)',   budget: 0    },
  transfer:      { label: 'Transfer',       icon: 'swap-horizontal-outline',  color: '#38BDF8', colorDim: 'rgba(56,189,248,0.15)',  budget: 0    },
  food:          { label: 'Food & Dining',  icon: 'restaurant-outline',       color: '#F97316', colorDim: 'rgba(249,115,22,0.15)',  budget: 400  },
  transport:     { label: 'Transport',      icon: 'car-outline',              color: '#3B82F6', colorDim: 'rgba(59,130,246,0.15)',  budget: 200  },
  entertainment: { label: 'Entertainment',  icon: 'film-outline',             color: '#A855F7', colorDim: 'rgba(168,85,247,0.15)',  budget: 100  },
  shopping:      { label: 'Shopping',       icon: 'bag-handle-outline',       color: '#EC4899', colorDim: 'rgba(236,72,153,0.15)',  budget: 150  },
  bills:         { label: 'Bills & Rent',   icon: 'receipt-outline',          color: '#EF4444', colorDim: 'rgba(239,68,68,0.15)',   budget: 1500 },
  health:        { label: 'Health',         icon: 'medkit-outline',           color: '#10C896', colorDim: 'rgba(16,200,150,0.15)',  budget: 100  },
  travel:        { label: 'Travel',         icon: 'airplane-outline',         color: '#6366F1', colorDim: 'rgba(99,102,241,0.15)',  budget: 300  },
  loans:         { label: 'Loans',          icon: 'card-outline',             color: '#F59E0B', colorDim: 'rgba(245,158,11,0.15)',  budget: 500  },
  fees:          { label: 'Fees',           icon: 'pricetag-outline',         color: '#F43F5E', colorDim: 'rgba(244,63,94,0.15)',   budget: 50   },
  home:          { label: 'Home',           icon: 'home-outline',             color: '#8B5CF6', colorDim: 'rgba(139,92,246,0.15)',  budget: 200  },
  personal_care: { label: 'Personal Care',  icon: 'cut-outline',              color: '#D946EF', colorDim: 'rgba(217,70,239,0.15)',  budget: 80   },
  services:      { label: 'Services',       icon: 'construct-outline',        color: '#0EA5E9', colorDim: 'rgba(14,165,233,0.15)',  budget: 100  },
  government:    { label: 'Government',     icon: 'business-outline',         color: '#475569', colorDim: 'rgba(71,85,105,0.18)',   budget: 100  },
  other:         { label: 'Other',          icon: 'ellipse-outline',          color: '#94A3B8', colorDim: 'rgba(148,163,184,0.18)', budget: 100  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

const FALLBACK = CATEGORIES.other;

// Accept canonical lowercase keys ('food'), legacy capitalized labels ('Food'),
// or unknown input. Always returns a valid metadata object.
export function categoryMeta(input) {
  if (!input) return FALLBACK;
  const key = String(input).toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORIES[key] ?? FALLBACK;
}

export function categoryKey(input) {
  if (!input) return 'other';
  const key = String(input).toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORIES[key] ? key : 'other';
}
