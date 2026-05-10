import { loadConfig } from '../config.js';
import type { ArticleDraft, ArticleEvent } from '../shared/types.js';
import {
  compactUsd,
  displayDate,
  formatPrice,
  formatUsd,
  hashToIndex,
  titleCase,
} from '../shared/format.js';

export function buildTemplateDraft(event: ArticleEvent): ArticleDraft {
  return event.kind === 'whale_loss'
    ? buildLossTemplate(event)
    : buildTradeTemplate(event);
}

function buildTradeTemplate(event: ArticleEvent): ArticleDraft {
  const { facts } = event;
  const name = titleCase(facts.traderName);
  const amount = compactUsd(facts.amountUsd);
  const action = facts.side === 'BUY' ? 'backs' : 'sells';
  const price = formatPrice(facts.priceCents);
  const when = displayDate(facts.timestamp);
  const titles = [
    `${name} ${action} ${facts.outcome} with ${amount} on Polymarket`,
    `A ${amount} whale trade just hit ${facts.marketTitle}`,
    `${name}'s ${amount} move puts ${facts.marketTitle} in focus`,
    `${amount} Polymarket whale trade lands on ${facts.marketTitle}`,
  ];
  const title = titles[hashToIndex(event.triggerKey, titles.length)];

  return {
    title,
    dek: `${name} placed a ${formatUsd(facts.amountUsd)} ${facts.side} trade on ${facts.outcome} at ${price}, according to Polywhale-tracked activity.`,
    body: [
      `Polywhale detected a ${formatUsd(facts.amountUsd)} whale trade on ${facts.marketTitle}. The wallet ${facts.traderName} ${facts.side === 'BUY' ? 'bought' : 'sold'} ${facts.outcome} shares at ${price}.`,
      `The trade was recorded at ${when}. It involved ${Math.round(facts.shares).toLocaleString('en-US')} shares, making it large enough to stand out in the live Polymarket flow.`,
      `Large trades do not prove where a market will settle, but they can show where serious capital is concentrating. This article is based on public market data tracked by Polywhale.`,
    ],
    tags: ['Polymarket', 'Whale trade', facts.category || 'Prediction markets'].filter(Boolean),
  };
}

function buildLossTemplate(event: ArticleEvent): ArticleDraft {
  const { facts } = event;
  const name = titleCase(facts.traderName);
  const loss = compactUsd(facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd));
  const when = displayDate(facts.resolvedAt ?? facts.timestamp);
  const titles = [
    `${name} just lost ${loss} on ${facts.marketTitle}`,
    `${loss} whale loss lands after ${facts.marketTitle} resolves`,
    `${name}'s Polymarket bet turns into a ${loss} loss`,
    `A ${loss} whale loss just closed on Polymarket`,
  ];
  const title = titles[hashToIndex(event.triggerKey, titles.length)];

  return {
    title,
    dek: `${name}'s ${formatUsd(facts.amountUsd)} ${facts.outcome} position resolved against the wallet, leaving an estimated ${formatUsd(facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd))} loss.`,
    body: [
      `A whale position tracked by Polywhale has resolved as a loss. The wallet ${facts.traderName} held ${facts.outcome} on ${facts.marketTitle}, while the market resolved to ${facts.winningOutcome ?? 'the other side'}.`,
      `The original BUY trade was sized at ${formatUsd(facts.amountUsd)} and was entered at ${formatPrice(facts.priceCents)}. The resolved outcome was recorded at ${when}.`,
      `For BUY trades, Polywhale estimates realized P/L as payout minus entry cost. This article covers the resolved trade outcome and does not infer the trader's broader portfolio or motive.`,
    ],
    tags: ['Polymarket', 'Whale loss', 'Resolved markets'],
  };
}

export function canonicalUrlForSlug(slug: string): string {
  return `${loadConfig().publicSiteUrl}/news/${slug}`;
}

