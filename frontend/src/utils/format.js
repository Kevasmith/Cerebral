// Shared formatting helpers used across screens.

export function fmtBalance(val) {
  const n = parseFloat(val ?? 0);
  const abs = Math.abs(n);
  const fmt = abs.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${fmt}` : `$${fmt}`;
}

export function timeSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function bankInitial(name) {
  if (!name) return '?';
  const words = name.trim().split(' ');
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function bankColor(name) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('td'))                          return '#1A6137';
  if (n.includes('rbc') || n.includes('royal'))  return '#005DAA';
  if (n.includes('scotia'))                      return '#EC1C24';
  if (n.includes('bmo'))                         return '#0277BD';
  if (n.includes('cibc'))                        return '#C41230';
  if (n.includes('national'))                    return '#E2001A';
  if (n.includes('tangerine'))                   return '#FF6900';
  if (n.includes('desjardins'))                  return '#008542';
  return '#1E3A5F';
}
