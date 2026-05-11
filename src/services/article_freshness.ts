import type { NewsArticleDoc } from '../shared/types.js';

const DEFAULT_TRADE_MAX_EVENT_AGE_HOURS = 4;

export function isStaleTradeArticle(article: Pick<NewsArticleDoc, 'kind' | 'facts' | 'publishedAt'>): boolean {
  if (article.kind !== 'whale_trade') return false;

  const publishedAt = toDate(article.publishedAt);
  const eventTimestamp = article.facts?.timestamp;
  if (!publishedAt || !eventTimestamp) return false;

  const ageHours = (publishedAt.getTime() - eventTimestamp * 1000) / (60 * 60 * 1000);
  return ageHours > tradeMaxEventAgeHours();
}

export function shouldListNewsArticle(article: NewsArticleDoc): boolean {
  return !isStaleTradeArticle(article);
}

function tradeMaxEventAgeHours(): number {
  const parsed = Number.parseInt(process.env['TRADE_NEWS_MAX_EVENT_AGE_HOURS'] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRADE_MAX_EVENT_AGE_HOURS;
}

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
