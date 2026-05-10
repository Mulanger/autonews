import type {
  ArticleByline,
  ArticleEvent,
  ArticleFactSet,
  ArticleSourceLink,
  NewsArticleDoc,
} from '../shared/types.js';

export const DEFAULT_BYLINE_NAME = 'Polywhale News Desk';
export const DEFAULT_EDITORIAL_DISCLOSURE =
  'This story was generated from public Polymarket trade and resolution data tracked by Polywhale, with deterministic fact checks before publication.';

export function buildArticleByline(): ArticleByline {
  return {
    name: DEFAULT_BYLINE_NAME,
    url: `${publicSiteUrl()}/about`,
    type: 'Organization',
  };
}

export function buildEditorialDisclosure(): string {
  return DEFAULT_EDITORIAL_DISCLOSURE;
}

export function buildSourceLinks(input: ArticleEvent | NewsArticleDoc): ArticleSourceLink[] {
  const facts = input.facts;
  const siteUrl = publicSiteUrl();
  const links: ArticleSourceLink[] = [];

  if (facts.marketSlug) {
    links.push({
      label: 'Polywhale market page',
      url: `${siteUrl}/market/${encodeURIComponent(facts.marketSlug)}`,
      kind: 'polywhale',
    });
  }

  if (facts.wallet && facts.wallet !== 'unknown-wallet') {
    links.push({
      label: 'Polywhale wallet profile',
      url: `${siteUrl}/trader/${encodeURIComponent(facts.wallet.toLowerCase())}`,
      kind: 'polywhale',
    });
  }

  if (facts.tradeId) {
    links.push({
      label: 'Polywhale trade detail',
      url: `${siteUrl}/trade/${encodeURIComponent(facts.tradeId)}`,
      kind: 'polywhale',
    });
  }

  const polymarketUrl = normalizeUrl(facts.polymarketUrl);
  if (polymarketUrl) {
    links.push({
      label: 'Polymarket market',
      url: polymarketUrl,
      kind: 'polymarket',
    });
  }

  const polygonUrl = polygonTransactionUrl(facts);
  if (polygonUrl) {
    links.push({
      label: 'Polygon transaction',
      url: polygonUrl,
      kind: 'polygonscan',
    });
  }

  return dedupeLinks(links).slice(0, 6);
}

export function publicSiteUrl(): string {
  return (process.env['PUBLIC_SITE_URL'] ?? 'https://www.polywhaletrades.com').replace(/\/$/, '');
}

function polygonTransactionUrl(facts: ArticleFactSet): string | null {
  const hash = facts.transactionHash?.trim();
  if (!hash || !/^0x[a-f0-9]{16,}$/i.test(hash)) return null;
  return `https://polygonscan.com/tx/${hash}`;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function dedupeLinks(links: ArticleSourceLink[]): ArticleSourceLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}
