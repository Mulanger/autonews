# Polywhale Autonews Agent Handoff

This repo owns the automated news worker and article API for Polywhale. It is intentionally additive: it reads whale trades from the existing Redis/API/Mongo contracts, writes only to its own `news_articles` collection, and exposes article JSON/HTML/sitemaps for the website to consume.

## Role

- Create a news article when a whale trade at or above `TRADE_NEWS_MIN_USD` is observed.
- Create a news article when the resolution tracker materializes a resolved BUY loss at or above `LOSS_NEWS_MIN_USD`.
- Use MiniMax M2.7 through an environment variable key to make article copy varied, but always fall back to deterministic template copy if AI is unavailable.
- Serve article APIs and sitemap/RSS routes for Railway.

## Non-Negotiables

- Do not write to `trades`, `market_resolutions`, `trade_outcomes`, or existing `traders` fields.
- Do not commit API keys. Configure `MINIMAX_API_KEY` in Railway.
- Article URLs are canonicalized to `PUBLIC_SITE_URL/news/:slug`.
- Dedupe is based on `triggerKey`, not title or slug text.
- Generated copy must stay factual. It may be catchy, but it must not invent trader identity, motive, or profit/loss beyond the stored trade/outcome data.

## Data Flow

1. `whale-watcher` publishes large trades on Redis channel `whales`.
2. This service subscribes and creates `whale_trade` articles for qualifying trades.
3. `Resolution-tracker` publishes market events on Redis channel `market_resolutions`.
4. This service looks up qualifying `trade_outcomes` losses and creates `whale_loss` articles.
5. A periodic backfill polls `/v1/whales` and scans recent `trade_outcomes` to cover downtime.
6. The website fetches article JSON from this service and renders canonical `/news` pages under the existing Polywhale chrome.

## Railway

Build uses the Dockerfile. Runtime command is `npm start`, and `/health` is the health check.

