import { compactUsd, hashToIndex, sanitizeWalletLabels } from '../shared/format.js';
import type { ArticleEvent, ArticleImage, NewsArticleDoc } from '../shared/types.js';
import { escapeXml } from '../shared/xml.js';
import { publicSiteUrl } from './article_sources.js';

export const ARTICLE_IMAGE_WIDTH = 1200;
export const ARTICLE_IMAGE_HEIGHT = 675;

export function articleImagePathForSlug(slug: string): string {
  return `/news/${encodeURIComponent(slug)}/image.svg`;
}

export function buildArticleImage(input: ArticleEvent | NewsArticleDoc): ArticleImage {
  const slug = input.slug;
  const facts = input.facts;
  const amount = compactUsd(facts.lossUsd ?? facts.amountUsd);
  const kindLabel = input.kind === 'whale_loss' ? 'resolved Polymarket whale loss' : 'Polymarket whale trade';

  return {
    url: `${publicSiteUrl()}${articleImagePathForSlug(slug)}`,
    alt: `${amount} ${kindLabel} on ${cleanImageText(facts.marketTitle, 90)}`,
    width: ARTICLE_IMAGE_WIDTH,
    height: ARTICLE_IMAGE_HEIGHT,
    mimeType: 'image/svg+xml',
    credit: 'Polywhale data visualization',
  };
}

export function renderArticleImageSvg(article: NewsArticleDoc): string {
  const facts = article.facts;
  const isLoss = article.kind === 'whale_loss';
  const amount = compactUsd(facts.lossUsd ?? facts.amountUsd);
  const action = isLoss ? 'Resolved whale loss' : `${facts.side} ${facts.outcome}`;
  const market = cleanImageText(facts.marketTitle, 82);
  const headline = cleanImageText(article.title, 96);
  const trader = cleanImageText(facts.traderName || 'Polymarket whale', 34);
  const bars = buildBars(article.triggerKey);
  const headlineLines = svgTextLines(headline, 0, 196, 52, 31, 42);
  const accent = isLoss ? '#ff7b8a' : '#5ee7ad';
  const accentSoft = isLoss ? 'rgba(255,123,138,.16)' : 'rgba(94,231,173,.16)';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ARTICLE_IMAGE_WIDTH}" height="${ARTICLE_IMAGE_HEIGHT}" viewBox="0 0 ${ARTICLE_IMAGE_WIDTH} ${ARTICLE_IMAGE_HEIGHT}" role="img" aria-label="${escapeXml(article.image?.alt || headline)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07100d"/>
      <stop offset=".55" stop-color="#0c1713"/>
      <stop offset="1" stop-color="#111714"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="9%" r="72%">
      <stop offset="0" stop-color="${accent}" stop-opacity=".22"/>
      <stop offset=".42" stop-color="${accent}" stop-opacity=".06"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity=".32"/>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <path d="M0 548 C190 490 284 590 478 530 C670 470 798 554 984 494 C1072 466 1142 456 1200 462 L1200 675 L0 675 Z" fill="${accentSoft}"/>
  <g transform="translate(76 70)">
    <text x="0" y="0" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="4">POLYWHALE NEWS</text>
    <text x="0" y="82" fill="#eef8f4" font-family="Inter, Arial, sans-serif" font-size="82" font-weight="900">${escapeXml(amount)}</text>
    <text x="0" y="130" fill="rgba(238,248,244,.68)" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800">${escapeXml(action)}</text>
    ${headlineLines}
    <text x="0" y="445" fill="rgba(238,248,244,.64)" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="760">${escapeXml(market)}</text>
    <text x="0" y="488" fill="rgba(238,248,244,.46)" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="760">${escapeXml(trader)} · public Polymarket data</text>
  </g>
  <g transform="translate(838 122)" filter="url(#shadow)">
    <rect x="0" y="0" width="286" height="390" rx="26" fill="rgba(255,255,255,.055)" stroke="rgba(255,255,255,.14)"/>
    <text x="30" y="58" fill="rgba(238,248,244,.58)" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="900" letter-spacing="2">WHALE FLOW</text>
    ${bars}
    <circle cx="64" cy="306" r="32" fill="${accent}" fill-opacity=".92"/>
    <circle cx="142" cy="306" r="32" fill="rgba(255,255,255,.16)"/>
    <circle cx="220" cy="306" r="32" fill="rgba(255,255,255,.09)"/>
  </g>
</svg>`;
}

function svgTextLines(
  text: string,
  x: number,
  firstY: number,
  lineHeight: number,
  maxChars: number,
  fontSize: number,
): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);

  return lines
    .slice(0, 3)
    .map((line, index) => {
      const suffix = index === 2 && lines.length > 3 ? '...' : '';
      return `<text x="${x}" y="${firstY + index * lineHeight}" fill="#eef8f4" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="850">${escapeXml(line + suffix)}</text>`;
    })
    .join('\n    ');
}

function buildBars(seed: string): string {
  const heights = Array.from({ length: 9 }, (_, index) => 56 + hashToIndex(`${seed}:${index}`, 168));
  return heights
    .map((height, index) => {
      const x = 32 + index * 25;
      const y = 246 - height;
      const opacity = 0.32 + index * 0.055;
      return `<rect x="${x}" y="${y}" width="14" height="${height}" rx="7" fill="#5ee7ad" opacity="${opacity.toFixed(2)}"/>`;
    })
    .join('');
}

function cleanImageText(value: string, maxLength: number): string {
  const cleaned = sanitizeWalletLabels(String(value || 'Polymarket market'))
    .replace(/\s+/g, ' ')
    .replace(/\b([A-Z][A-Z]{2,})\b/g, (match) => match.charAt(0) + match.slice(1).toLowerCase())
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}...`;
}
