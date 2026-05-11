import { loadConfig } from '../config.js';
import { GENERIC_TRADER_LABEL } from '../shared/format.js';
import type { ArticleEvent, ArticleQuality, NewsArticleDoc } from '../shared/types.js';

export interface ArticleGateResult {
  ok: boolean;
  quality: ArticleQuality;
  reason?: string;
}

export function scoreArticleEvent(event: ArticleEvent): ArticleQuality {
  const facts = event.facts;
  const amount = event.kind === 'whale_loss' ? facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd) : facts.amountUsd;
  const reasons: string[] = [];
  let score = 0;

  if (event.kind === 'whale_loss') {
    score += 2;
    reasons.push('resolved_loss');
  }

  if (amount >= 1_000_000) {
    score += 5;
    reasons.push('seven_figure_story');
  } else if (amount >= 500_000) {
    score += 4;
    reasons.push('very_large_story');
  } else if (amount >= 250_000) {
    score += 3;
    reasons.push('large_story');
  } else if (amount >= 100_000) {
    score += 1;
    reasons.push('qualifying_story');
  }

  if (facts.traderName && facts.traderName !== GENERIC_TRADER_LABEL) {
    score += 1;
    reasons.push('public_trader_label');
  }

  if (facts.marketSlug && facts.conditionId) {
    score += 1;
    reasons.push('market_context_available');
  }

  if (facts.polymarketUrl || facts.transactionHash) {
    score += 1;
    reasons.push('verifiable_source_link');
  }

  const category = String(facts.category || '').toLowerCase();
  if (/(crypto|politic|econom|finance|election|fed|inflation|sports)/.test(category)) {
    score += 1;
    reasons.push('search_relevant_category');
  }

  const eventTime = facts.resolvedAt ?? facts.timestamp;
  const eventAgeHours = Math.max(0, (Date.now() / 1000 - eventTime) / 3600);

  return {
    score,
    reasons,
    clusterKey: clusterKeyForEvent(event),
    eventAgeHours,
  };
}

export function evaluateArticleGate(event: ArticleEvent, similarArticle: NewsArticleDoc | null): ArticleGateResult {
  const config = loadConfig();
  const quality = scoreArticleEvent(event);
  const maxEventAgeHours =
    event.kind === 'whale_trade'
      ? config.tradeNewsMaxEventAgeHours
      : config.lossNewsMaxEventAgeHours || config.newsMaxEventAgeHours;

  if (quality.eventAgeHours > maxEventAgeHours) {
    return {
      ok: false,
      quality,
      reason: `event is ${quality.eventAgeHours.toFixed(1)}h old; max is ${maxEventAgeHours}h`,
    };
  }

  if (quality.score < config.newsMinStoryScore) {
    return {
      ok: false,
      quality,
      reason: `story score ${quality.score} is below ${config.newsMinStoryScore}`,
    };
  }

  if (similarArticle) {
    const breakoutUsd = event.kind === 'whale_loss' ? config.lossNewsBreakoutUsd : config.tradeNewsBreakoutUsd;
    const newAmount = articleAmount(event);
    const existingAmount = articleAmount(similarArticle);
    const isBreakout = newAmount >= breakoutUsd && newAmount >= existingAmount * 1.5;

    if (!isBreakout) {
      return {
        ok: false,
        quality,
        reason: `recent similar article ${similarArticle.slug} already covers this cluster`,
      };
    }

    quality.reasons.push('breakout_update');
  }

  return { ok: true, quality };
}

export function clusterKeyForEvent(event: Pick<ArticleEvent, 'kind' | 'facts'>): string {
  const facts = event.facts;
  const marketKey = facts.conditionId || facts.marketSlug || 'unknown-market';
  const walletKey = facts.wallet || 'unknown-wallet';
  const sideKey = `${facts.side}:${facts.outcome}`;
  return [event.kind, marketKey, walletKey, sideKey].join(':').toLowerCase();
}

function articleAmount(input: ArticleEvent | NewsArticleDoc): number {
  const facts = input.facts;
  return input.kind === 'whale_loss'
    ? facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd)
    : facts.amountUsd;
}
