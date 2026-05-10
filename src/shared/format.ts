const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export function compactUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${trimNumber(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `$${trimNumber(abs / 1_000)}K`;
  return `$${Math.round(abs).toLocaleString('en-US')}`;
}

export function formatUsd(value: number): string {
  return `$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

export function formatPrice(priceCents: number | null | undefined): string {
  if (priceCents == null || !Number.isFinite(priceCents)) return 'unknown price';
  return `${Math.round(priceCents)}c`;
}

export function dateSlug(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  return `${MONTHS[date.getUTCMonth()]}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
}

export function displayDate(timestampSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(timestampSeconds * 1000));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 92)
    .replace(/-+$/g, '');
}

export function shortWallet(wallet: string | null | undefined): string {
  if (!wallet) return 'unknown-whale';
  const normalized = wallet.toLowerCase();
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 6)}-${normalized.slice(-4)}`;
}

export function traderLabel(input: {
  wallet?: string | null;
  pseudonym?: string | null;
  displayName?: string | null;
}): string {
  const chosen = input.displayName || input.pseudonym;
  if (chosen && chosen.trim().length > 0) return chosen.trim();
  return shortWallet(input.wallet);
}

export function titleCase(input: string): string {
  return input.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function hashToIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}

function trimNumber(value: number): string {
  const fixed = value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
}

