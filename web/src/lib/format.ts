const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const absoluteFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 3600_000 },
  { unit: 'month', ms: 30 * 24 * 3600_000 },
  { unit: 'week', ms: 7 * 24 * 3600_000 },
  { unit: 'day', ms: 24 * 3600_000 },
  { unit: 'hour', ms: 3600_000 },
  { unit: 'minute', ms: 60_000 },
];

/** "2 hours ago" — pair with formatAbsolute in a title attribute for precision. */
export function formatRelative(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  for (const { unit, ms } of UNITS) {
    if (Math.abs(delta) >= ms) return relativeFormatter.format(Math.round(delta / ms), unit);
  }
  return 'just now';
}

export function formatAbsolute(iso: string): string {
  return absoluteFormatter.format(new Date(iso));
}
