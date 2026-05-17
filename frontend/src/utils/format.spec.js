import { fmtBalance, timeSince, bankInitial, bankColor } from './format';

describe('fmtBalance', () => {
  it('formats a positive number with a dollar sign and two decimal places', () => {
    expect(fmtBalance(1234.5)).toBe('$1,234.50');
  });

  it('formats a negative number with a leading minus and dollar sign', () => {
    expect(fmtBalance(-500)).toBe('-$500.00');
  });

  it('formats zero as $0.00', () => {
    expect(fmtBalance(0)).toBe('$0.00');
  });

  it('handles a string-typed numeric value', () => {
    expect(fmtBalance('2500.99')).toBe('$2,500.99');
  });

  it('handles null/undefined by treating them as 0', () => {
    expect(fmtBalance(null)).toBe('$0.00');
    expect(fmtBalance(undefined)).toBe('$0.00');
  });

  it('formats large numbers with commas', () => {
    expect(fmtBalance(1_000_000)).toBe('$1,000,000.00');
  });
});

describe('timeSince', () => {
  const now = Date.now();

  it('returns null for a falsy input', () => {
    expect(timeSince(null)).toBeNull();
    expect(timeSince(undefined)).toBeNull();
    expect(timeSince('')).toBeNull();
  });

  it('returns "Just now" for a timestamp less than 2 minutes ago', () => {
    const oneMinuteAgo = new Date(now - 60_000).toISOString();
    expect(timeSince(oneMinuteAgo)).toBe('Just now');
  });

  it('returns minutes ago for timestamps between 2 and 59 minutes ago', () => {
    const fiveMinutesAgo = new Date(now - 5 * 60_000).toISOString();
    expect(timeSince(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago for timestamps between 1 and 23 hours ago', () => {
    const threeHoursAgo = new Date(now - 3 * 60 * 60_000).toISOString();
    expect(timeSince(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago for timestamps 24+ hours ago', () => {
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60_000).toISOString();
    expect(timeSince(twoDaysAgo)).toBe('2d ago');
  });
});

describe('bankInitial', () => {
  it('returns the first two uppercase letters of a single-word name', () => {
    expect(bankInitial('RBC')).toBe('RB');
  });

  it('returns initials of the first two words for a multi-word name', () => {
    expect(bankInitial('Royal Bank')).toBe('RB');
    expect(bankInitial('TD Canada Trust')).toBe('TC');
  });

  it('returns "?" for a null or undefined name', () => {
    expect(bankInitial(null)).toBe('?');
    expect(bankInitial(undefined)).toBe('?');
    expect(bankInitial('')).toBe('?');
  });

  it('handles leading/trailing whitespace', () => {
    expect(bankInitial('  Scotia Bank  ')).toBe('SB');
  });
});

describe('bankColor', () => {
  it.each([
    ['TD Bank',              '#1A6137'],
    ['RBC Royal Bank',       '#005DAA'],
    ['Royal Bank of Canada', '#005DAA'],
    ['Scotiabank',           '#EC1C24'],
    ['BMO',                  '#0277BD'],
    ['CIBC',                 '#C41230'],
    ['National Bank',        '#E2001A'],
    ['Tangerine',            '#FF6900'],
    ['Desjardins',           '#008542'],
  ])('returns the correct colour for %s', (name, expected) => {
    expect(bankColor(name)).toBe(expected);
  });

  it('returns the default dark colour for an unknown bank', () => {
    expect(bankColor('Acme Financial')).toBe('#1E3A5F');
  });

  it('handles null/undefined without throwing', () => {
    expect(bankColor(null)).toBe('#1E3A5F');
    expect(bankColor(undefined)).toBe('#1E3A5F');
  });

  it('is case-insensitive', () => {
    expect(bankColor('TD BANK')).toBe('#1A6137');
    expect(bankColor('rbc direct investing')).toBe('#005DAA');
  });
});
