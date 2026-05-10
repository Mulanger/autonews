import { loadConfig } from '../config.js';
import type { ArticleDraft, ArticleEvent } from '../shared/types.js';
import {
  compactUsd,
  displayDate,
  formatPrice,
  formatUsd,
  GENERIC_TRADER_LABEL,
  hashToIndex,
  sanitizeWalletLabels,
  titleCase,
} from '../shared/format.js';

export function buildTemplateDraft(event: ArticleEvent): ArticleDraft {
  return event.kind === 'whale_loss'
    ? buildLossTemplate(event)
    : buildTradeTemplate(event);
}

function buildTradeTemplate(event: ArticleEvent): ArticleDraft {
  const { facts } = event;
  const name = displayTraderName(facts.traderName);
  const subject = sentenceSubject(facts.traderName);
  const amount = compactUsd(facts.amountUsd);
  const action = facts.side === 'BUY' ? 'backs' : 'sells';
  const price = formatPrice(facts.priceCents);
  const when = displayDate(facts.timestamp);
  const market = cleanMarketTitle(facts.marketTitle);
  const outcome = cleanOutcome(facts.outcome);
  const titles = [
    `${subject} ${action} ${outcome} with ${amount} on Polymarket`,
    `${amount} whale trade moves through ${market}`,
    `${subject}'s ${amount} move puts ${market} in focus`,
    `${amount} Polymarket whale trade lands on ${market}`,
  ];
  const title = titles[hashToIndex(event.triggerKey, titles.length)];

  return {
    title,
    dek: `${subject} placed a ${formatUsd(facts.amountUsd)} ${facts.side} trade on ${outcome} at ${price}, according to Polywhale-tracked activity.`,
    body: [
      `Polywhale detected a ${formatUsd(facts.amountUsd)} whale trade on ${market}. ${name} ${facts.side === 'BUY' ? 'bought' : 'sold'} ${outcome} shares at ${price}.`,
      `The trade was recorded at ${when}. It involved ${Math.round(facts.shares).toLocaleString('en-US')} shares, making it large enough to stand out in the live Polymarket flow.`,
      `The position is useful as a flow signal, not as a prediction. Large trades can show where serious capital is concentrating, but they do not prove where a market will settle.`,
      `This article is based on public market data tracked by Polywhale and should be read alongside the linked market, wallet, and transaction sources when available.`,
    ],
    tags: ['Polymarket', 'Whale trade', facts.category || 'Prediction markets'].filter(Boolean),
  };
}

function buildLossTemplate(event: ArticleEvent): ArticleDraft {
  const { facts } = event;
  const name = displayTraderName(facts.traderName);
  const subject = sentenceSubject(facts.traderName);
  const loss = compactUsd(facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd));
  const when = displayDate(facts.resolvedAt ?? facts.timestamp);
  const market = cleanMarketTitle(facts.marketTitle);
  const outcome = cleanOutcome(facts.outcome);
  const titles = [
    `${subject} loses ${loss} after ${market} resolves`,
    `${loss} whale loss lands after ${market} resolves`,
    `${subject}'s Polymarket bet turns into a ${loss} loss`,
    `A ${loss} whale loss closes on Polymarket`,
  ];
  const title = titles[hashToIndex(event.triggerKey, titles.length)];

  return {
    title,
    dek: `${subject}'s ${formatUsd(facts.amountUsd)} ${outcome} position resolved against the wallet, leaving an estimated ${formatUsd(facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd))} loss.`,
    body: [
      `A whale position tracked by Polywhale has resolved as a loss. ${name} held ${outcome} on ${market}, while the market resolved to ${facts.winningOutcome ?? 'the other side'}.`,
      `The original BUY trade was sized at ${formatUsd(facts.amountUsd)} and was entered at ${formatPrice(facts.priceCents)}. The resolved outcome was recorded at ${when}.`,
      `For BUY trades, Polywhale estimates realized P/L as payout minus entry cost. This article covers the resolved trade outcome and does not infer the trader's broader portfolio or motive.`,
      `Readers can use the linked wallet, market, and transaction sources to inspect the public record behind the article when those links are available.`,
    ],
    tags: ['Polymarket', 'Whale loss', 'Resolved markets'],
  };
}

export function canonicalUrlForSlug(slug: string): string {
  return `${loadConfig().publicSiteUrl}/news/${slug}`;
}

function displayTraderName(value: string): string {
  return value === GENERIC_TRADER_LABEL ? 'A Polymarket whale' : titleCase(value);
}

function sentenceSubject(value: string): string {
  return value === GENERIC_TRADER_LABEL ? 'A Polymarket whale' : titleCase(value);
}

function cleanMarketTitle(value: string): string {
  const cleaned = sanitizeWalletLabels(value)
    .replace(/^Will\s+(.+?)\s+win\s+on\s+(\d{4})-(\d{2})-(\d{2})\??$/i, (_match, team, year, month, day) => {
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      const label = Number.isNaN(date.getTime())
        ? `${year}-${month}-${day}`
        : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
      return `${team} win market for ${label}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'a Polymarket market';
}

function cleanOutcome(value: string): string {
  const text = String(value || 'YES').trim();
  if (/^(yes|no)$/i.test(text)) return text.toUpperCase();
  return titleCase(text.toLowerCase());
}
