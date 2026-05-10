import { describe, expect, it } from 'vitest';
import { buildTradeArticleEvent } from '../src/services/event_builder.js';

describe('event builder', () => {
  it('builds deterministic trade article events', () => {
    const event = buildTradeArticleEvent(
      {
        id: 'trade_abc123',
        side: 'BUY',
        outcome: 'YES',
        usdSize: 250000,
        shares: 500000,
        priceCents: 50,
        timestamp: 1778438400,
        market: {
          conditionId: '0xcondition',
          slug: 'sample-market',
          title: 'Will BTC hit $100K in 2026?',
          category: 'Crypto',
        },
        trader: {
          proxyWallet: '0x1234567890abcdef',
          pseudonym: null,
          displayName: null,
        },
        transactionHash: '0xhash',
      },
      'backfill',
    );

    expect(event?.triggerKey).toBe('trade:trade_abc123');
    expect(event?.slug).toContain('0x1234-cdef-backs-yes-250k');
    expect(event?.facts.marketTitle).toBe('Will BTC hit $100K in 2026?');
  });
});

