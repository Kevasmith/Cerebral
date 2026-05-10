// Shared design tokens — cream-light theme.
// Imported as `C` across screens. Add new tokens here rather than
// redefining them locally.

export const C = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  bg:         '#F4F2EC', // app background (warm cream)
  card:       '#FBF9F4', // primary card surface
  cardAlt:    '#F7F4EC', // nested card / inset surface
  surfaceDeep:'#0F172A', // dark surface for emphasis blocks (pill buttons, dark cards)

  // ── Text ────────────────────────────────────────────────────────────────
  text:       '#0F172A', // primary text (near-black navy)
  textInvert: '#FFFFFF', // text on dark surfaces / pill buttons
  muted:      'rgba(15,23,42,0.60)',
  faint:      '#9aa3b2',
  soft:       '#888',

  // ── Borders / dividers ─────────────────────────────────────────────────
  border:     '#ECE8DC',
  track:      '#ECE9DF',
  input:      '#F0EEE6',

  // ── Accents ────────────────────────────────────────────────────────────
  // Cerebral green (primary brand)
  teal:       '#10C896',
  tealDim:    'rgba(16,200,150,0.12)',
  tealBorder: 'rgba(16,200,150,0.25)',

  green:      '#0a9165', // deeper green for charts/positive
  greenLite:  '#27ae60',
  greenDim:   'rgba(10,145,101,0.10)',
  greenBorder:'rgba(10,145,101,0.25)',

  // Status
  red:        '#EF4444',
  redDim:     '#fbeae6',
  amber:      '#F59E0B',
  amberDim:   'rgba(245,158,11,0.12)',
  amberBorder:'rgba(245,158,11,0.30)',
  violet:     '#7C3AED',
  violetDim:  'rgba(124,58,237,0.10)',
  violetBorder:'rgba(124,58,237,0.18)',

  // Legacy aliases (keep for backwards compat with existing screens)
  white:      '#FFFFFF',
};

// Standard card shadow used across surfaces
export const SHADOW = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

// Subtle shadow for nested/inset cards
export const SHADOW_SOFT = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};
