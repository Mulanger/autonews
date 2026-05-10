import { request } from 'undici';
import { loadConfig } from '../config.js';
import { getLogger } from '../logger.js';
import { outcomesCollection } from '../db/mongo.js';
import type { WhaleDto } from '../shared/types.js';
import { writeLossArticle, writeTradeArticle } from '../services/article_writer.js';

interface WhaleFeedResponse {
  items?: WhaleDto[];
}

export async function runBackfillOnce(): Promise<{ tradeArticles: number; lossArticles: number }> {
  const config = loadConfig();
  const log = getLogger();
  let tradeArticles = 0;
  let lossArticles = 0;

  try {
    const whales = await fetchRecentWhales();
    for (const whale of whales.slice(0, config.maxArticlesPerBackfill)) {
      if (await writeTradeArticle(whale, 'backfill')) tradeArticles += 1;
    }
  } catch (err) {
    log.warn({ err }, 'trade article backfill failed');
  }

  try {
    const outcomes = await outcomesCollection()
      .find({
        side: 'BUY',
        status: 'resolved_loss',
        usdSize: { $gte: config.lossNewsMinUsd },
      })
      .sort({ resolvedAt: -1, _id: 1 })
      .limit(config.maxArticlesPerBackfill)
      .toArray();

    for (const outcome of outcomes) {
      if (await writeLossArticle(outcome, null, 'backfill')) lossArticles += 1;
    }
  } catch (err) {
    log.warn({ err }, 'loss article backfill failed');
  }

  return { tradeArticles, lossArticles };
}

export function startBackfillLoop(isShuttingDown: () => boolean): NodeJS.Timeout {
  const config = loadConfig();
  const log = getLogger();

  const run = async () => {
    if (isShuttingDown()) return;
    const result = await runBackfillOnce();
    if (result.tradeArticles || result.lossArticles) {
      log.info(result, 'backfill published articles');
    }
  };

  void run();
  return setInterval(() => {
    void run();
  }, config.backfillIntervalMs);
}

async function fetchRecentWhales(): Promise<WhaleDto[]> {
  const config = loadConfig();
  const url = new URL('/v1/whales', config.apiBaseUrl);
  url.searchParams.set('limit', String(config.backfillLimit));
  url.searchParams.set('minUsd', String(config.tradeNewsMinUsd));

  const response = await request(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    bodyTimeout: 20_000,
    headersTimeout: 20_000,
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Whale API returned ${response.statusCode}`);
  }
  const payload = (await response.body.json()) as WhaleFeedResponse;
  return Array.isArray(payload.items) ? payload.items : [];
}

