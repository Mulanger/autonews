import { describe, expect, it } from 'vitest';
import { sanitizePublicArticle } from '../src/db/repos/articles_repo.js';
import type { NewsArticleDoc } from '../src/shared/types.js';

describe('article public sanitizer', () => {
  it('removes wallet keys from public titles and summaries', () => {
    const now = new Date();
    const article = sanitizePublicArticle({
      _id: '0x1234-cdef-loses-250k',
      slug: '0x1234-cdef-loses-250k',
      triggerKey: 'loss:trade1',
      kind: 'whale_loss',
      status: 'published',
      title: '0x1234-cdef just lost $250K on Polymarket',
      dek: "0x1234-cdef's position resolved against the wallet.",
      body: ['The wallet 0x1234-cdef held YES.'],
      tags: ['Polymarket'],
      canonicalUrl: 'https://www.polywhaletrades.com/news/0x1234-cdef-loses-250k',
      facts: {
        tradeId: 'trade1',
        conditionId: 'condition1',
        marketSlug: 'market',
        marketTitle: 'Market',
        side: 'BUY',
        outcome: 'YES',
        amountUsd: 250000,
        shares: 250000,
        priceCents: 50,
        timestamp: 1778438400,
        wallet: '0x1234567890abcdef',
        traderName: '0x1234-cdef',
        transactionHash: null,
        polymarketUrl: null,
        category: null,
      },
      source: 'backfill',
      ai: { provider: 'template', model: 'template', usedFallback: true },
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(article.title).toBe('Polymarket whale just lost $250K on Polymarket');
    expect(article.dek).toBe("Polymarket whale's position resolved against the wallet.");
    expect(article.body[0]).toBe('The Polymarket whale held YES.');
    expect(article.facts.traderName).toBe('Polymarket whale');
  });
});
