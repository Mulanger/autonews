import type {
  ArticleEvent,
  ArticleFactSet,
  ResolutionEventPayload,
  TradeOutcomeDoc,
  WhaleDto,
} from '../shared/types.js';
import { compactUsd, dateSlug, shortWallet, slugify, traderLabel } from '../shared/format.js';

export function buildTradeArticleEvent(
  whale: WhaleDto,
  source: ArticleEvent['source'],
): ArticleEvent | null {
  if (!whale.id || !whale.usdSize || !whale.timestamp) return null;
  const facts = factsFromWhale(whale);
  const nameForSlug = slugify(facts.traderName || shortWallet(facts.wallet));
  const amount = slugify(compactUsd(facts.amountUsd).replace('$', ''));
  const verb = facts.side === 'BUY' ? 'backs' : 'sells';
  const slug = slugify(
    `${nameForSlug}-${verb}-${facts.outcome}-${amount}-${dateSlug(facts.timestamp)}-${shortId(facts.tradeId)}`,
  );

  return {
    kind: 'whale_trade',
    triggerKey: `trade:${facts.tradeId}`,
    slug,
    source,
    facts,
  };
}

export function buildLossArticleEvent(
  outcome: TradeOutcomeDoc,
  trade: Partial<WhaleDto> | null,
  resolution: ResolutionEventPayload | null,
  source: ArticleEvent['source'],
): ArticleEvent | null {
  if (outcome.status !== 'resolved_loss' || outcome.side !== 'BUY') return null;
  const wallet = outcome.proxyWallet.toLowerCase();
  const market = trade?.market;
  const timestamp = outcome.timestamp || Math.floor(Date.now() / 1000);
  const lossUsd = Math.abs(outcome.pnlUsd ?? outcome.usdSize);
  const traderName = traderLabel({
    wallet,
    pseudonym: trade?.trader?.pseudonym,
    displayName: trade?.trader?.displayName,
  });
  const facts: ArticleFactSet = {
    tradeId: outcome._id,
    conditionId: outcome.conditionId,
    marketSlug: market?.slug ?? resolution?.slug ?? null,
    marketTitle: market?.title ?? 'a resolved Polymarket market',
    side: outcome.side,
    outcome: outcome.outcome,
    amountUsd: outcome.usdSize,
    shares: outcome.shares,
    priceCents: outcome.entryPriceCents,
    timestamp,
    wallet,
    traderName,
    transactionHash: trade?.transactionHash ?? null,
    polymarketUrl: trade?.polymarketUrl ?? market?.polymarketUrl ?? null,
    category: market?.category ?? null,
    marketImageUrl: marketImageUrl(market),
    lossUsd,
    pnlUsd: outcome.pnlUsd,
    payoutUsd: outcome.payoutUsd,
    winningOutcome: outcome.winningOutcome ?? resolution?.winningOutcome ?? null,
    resolvedAt: outcome.resolvedAt
      ? Math.floor(outcome.resolvedAt.getTime() / 1000)
      : resolution?.resolvedAt ?? null,
  };

  const nameForSlug = slugify(traderName || shortWallet(wallet));
  const amount = slugify(compactUsd(lossUsd).replace('$', ''));
  const slug = slugify(
    `${nameForSlug}-loses-${amount}-${dateSlug(facts.resolvedAt ?? timestamp)}-${shortId(outcome._id)}`,
  );

  return {
    kind: 'whale_loss',
    triggerKey: `loss:${outcome._id}`,
    slug,
    source,
    facts,
  };
}

function factsFromWhale(whale: WhaleDto): ArticleFactSet {
  const wallet = whale.trader?.proxyWallet?.toLowerCase() ?? 'unknown-wallet';
  return {
    tradeId: whale.id,
    conditionId: whale.market?.conditionId ?? null,
    marketSlug: whale.market?.slug ?? null,
    marketTitle: whale.market?.title ?? 'a Polymarket market',
    side: whale.side,
    outcome: String(whale.outcome || '').toUpperCase() || 'YES',
    amountUsd: whale.usdSize,
    shares: whale.shares,
    priceCents: whale.priceCents ?? (whale.priceMillicents ? Math.round(whale.priceMillicents / 100) : null),
    timestamp: whale.timestamp,
    wallet,
    traderName: traderLabel({
      wallet,
      pseudonym: whale.trader?.pseudonym,
      displayName: whale.trader?.displayName,
    }),
    transactionHash: whale.transactionHash ?? null,
    polymarketUrl: whale.polymarketUrl ?? whale.market?.polymarketUrl ?? null,
    category: whale.market?.category ?? null,
    marketImageUrl: marketImageUrl(whale.market),
  };
}

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
}

function marketImageUrl(market: WhaleDto['market'] | undefined): string | null {
  const value = market?.imageUrl || market?.image || market?.iconUrl || market?.icon || null;
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
