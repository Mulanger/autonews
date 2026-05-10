import type { ResolutionEventPayload, TradeOutcomeDoc, WhaleDto } from '../shared/types.js';
import { claimArticle, markArticleFailed, publishArticle } from '../db/repos/articles_repo.js';
import { outcomesCollection, tradesCollection } from '../db/mongo.js';
import { loadConfig } from '../config.js';
import { getLogger } from '../logger.js';
import { canonicalUrlForSlug } from './article_templates.js';
import { buildLossArticleEvent, buildTradeArticleEvent } from './event_builder.js';
import { generateArticleDraft } from './minimax_client.js';

export async function writeTradeArticle(
  whale: WhaleDto,
  source: 'redis' | 'backfill' | 'hook',
): Promise<boolean> {
  const config = loadConfig();
  if (whale.usdSize < config.tradeNewsMinUsd) return false;

  const event = buildTradeArticleEvent(whale, source);
  if (!event) return false;
  return writeArticleForEvent(event);
}

export async function writeLossArticlesForResolution(
  resolution: ResolutionEventPayload,
  source: 'redis' | 'backfill' | 'hook',
): Promise<number> {
  if (resolution.type !== 'resolved') return 0;
  return writeLossArticlesForCondition(resolution.conditionId, resolution, source);
}

export async function writeLossArticlesForCondition(
  conditionId: string,
  resolution: ResolutionEventPayload | null,
  source: 'redis' | 'backfill' | 'hook',
  limit = 50,
): Promise<number> {
  const config = loadConfig();
  const outcomes = await outcomesCollection()
    .find({
      conditionId: conditionId.toLowerCase(),
      side: 'BUY',
      status: 'resolved_loss',
      usdSize: { $gte: config.lossNewsMinUsd },
    })
    .sort({ usdSize: -1, _id: 1 })
    .limit(limit)
    .toArray();

  let written = 0;
  for (const outcome of outcomes) {
    if (await writeLossArticle(outcome, resolution, source)) written += 1;
  }
  return written;
}

export async function writeLossArticle(
  outcome: TradeOutcomeDoc,
  resolution: ResolutionEventPayload | null,
  source: 'redis' | 'backfill' | 'hook',
): Promise<boolean> {
  const config = loadConfig();
  const lossUsd = Math.abs(outcome.pnlUsd ?? outcome.usdSize);
  if (lossUsd < config.lossNewsMinUsd || outcome.side !== 'BUY') return false;

  const trade = await findTradeForOutcome(outcome);
  const event = buildLossArticleEvent(outcome, trade, resolution, source);
  if (!event) return false;
  return writeArticleForEvent(event);
}

async function writeArticleForEvent(
  event: NonNullable<ReturnType<typeof buildTradeArticleEvent>>,
): Promise<boolean> {
  const log = getLogger();
  const claim = await claimArticle(event);
  if (!claim.inserted) {
    log.debug({ triggerKey: event.triggerKey }, 'article already exists');
    return false;
  }

  try {
    const generated = await generateArticleDraft(event);
    await publishArticle(event.slug, {
      title: generated.draft.title,
      dek: generated.draft.dek,
      body: generated.draft.body,
      tags: generated.draft.tags,
      canonicalUrl: canonicalUrlForSlug(event.slug),
      ai: {
        provider: generated.provider,
        model: generated.model,
        usedFallback: generated.usedFallback,
        ...(generated.error ? { error: generated.error } : {}),
      },
    });
    log.info(
      {
        slug: event.slug,
        kind: event.kind,
        triggerKey: event.triggerKey,
        provider: generated.provider,
        fallback: generated.usedFallback,
      },
      'news article published',
    );
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markArticleFailed(event.slug, message);
    log.error({ err, slug: event.slug, triggerKey: event.triggerKey }, 'article generation failed');
    return false;
  }
}

async function findTradeForOutcome(outcome: TradeOutcomeDoc): Promise<Partial<WhaleDto> | null> {
  const trade = await tradesCollection().findOne({ _id: outcome._id });
  if (!trade) return null;
  return {
    id: String(trade._id),
    side: trade.side,
    outcome: trade.outcome,
    usdSize: trade.usdSize,
    shares: trade.shares,
    priceCents: trade.priceCents,
    priceMillicents: trade.priceMillicents,
    timestamp: trade.timestamp,
    market: trade.market,
    trader: trade.trader,
    transactionHash: trade.transactionHash,
    polymarketUrl: trade.polymarketUrl ?? trade.market?.polymarketUrl,
  };
}

