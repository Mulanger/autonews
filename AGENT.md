# Polywhale Autonews Agent Handoff

This repo owns the automated news worker and article API for Polywhale. It is intentionally additive: it reads whale trades from the existing Redis/API/Mongo contracts, writes only to its own `news_articles` collection, and exposes article JSON/HTML/sitemaps for the website to consume.

## Role

- Create a news article when a whale trade at or above `TRADE_NEWS_MIN_USD` is observed.
- Create a news article when the resolution tracker materializes a resolved BUY loss at or above `LOSS_NEWS_MIN_USD`.
- Use MiniMax M2.7 through an environment variable key to make article copy varied, but always fall back to deterministic template copy if AI is unavailable.
- Apply the SEO quality gate before publishing: story score, event age, and recent similar article clusters are checked so the worker publishes fewer, stronger stories instead of many near-duplicate blurbs.
- Every public article should expose a byline, editorial disclosure, source links, and an article-specific 1200x675 SVG image at `/news/:slug/image.svg` and `/v1/news/:slug/image.svg`.
- Serve article APIs and sitemap/RSS routes for Railway.
- The website renders canonical `/news` pages from this service through `AUTONEWS_BASE_URL`; do not point article canonicals at the autonews Railway subdomain.

## Non-Negotiables

- Do not write to `trades`, `market_resolutions`, `trade_outcomes`, or existing `traders` fields.
- Do not commit API keys. Configure `MINIMAX_API_KEY` in Railway.
- Article URLs are canonicalized to `PUBLIC_SITE_URL/news/:slug`.
- Dedupe is based on `triggerKey`, not title or slug text.
- Generated copy must stay factual. It may be catchy, but it must not invent trader identity, motive, or profit/loss beyond the stored trade/outcome data.
- If no public username/display name exists, use `Polymarket whale` in titles and summaries. Avoid wallet keys or `0x...` strings in titles/deks.

## Data Flow

1. `whale-watcher` publishes large trades on Redis channel `whales`.
2. This service subscribes and creates `whale_trade` articles for qualifying trades.
3. `Resolution-tracker` publishes market events on Redis channel `market_resolutions`.
4. This service looks up qualifying `trade_outcomes` losses and creates `whale_loss` articles.
5. A periodic backfill polls `/v1/whales` and scans recent `trade_outcomes` to cover downtime.
6. The website fetches article JSON from this service and renders canonical `/news` pages under the existing Polywhale chrome.

## Public URLs and Sitemaps

- Canonical news hub: `https://www.polywhaletrades.com/news`.
- Canonical article URL shape: `https://www.polywhaletrades.com/news/:slug`.
- Website Search Console submissions: submit `sitemap.xml` and `sitemap-news.xml` on `www.polywhaletrades.com`.
- The website root sitemap includes `/news` and published article URLs.
- The website `/sitemap-news.xml` is a Google News sitemap limited to articles from the last 48 hours, so it can be empty when no fresh stories exist.
- This service also serves `/sitemap.xml`, `/news-sitemap.xml`, and `/rss.xml` for diagnostics, but public search indexing should use the website domain sitemaps.

## Main API/Health Checks

- `GET /health`: service status and `news_articles` counts.
- `GET /v1/news?limit=5`: latest published articles.
- `GET /v1/news/:slug`: one published article.
- `GET /v1/news/:slug/image.svg`: generated article image for canonical website metadata.
- `GET /news`: standalone HTML fallback; the primary public hub is still the website route.

## SEO Quality Controls

- `NEWS_MIN_STORY_SCORE` defaults to `3`.
- `NEWS_DUPLICATE_WINDOW_MS` defaults to six hours.
- `TRADE_NEWS_MAX_EVENT_AGE_HOURS` defaults to `4`; stale whale-trade backfills older than this should not publish as fresh news and are filtered out of public lists/sitemaps.
- `LOSS_NEWS_MAX_EVENT_AGE_HOURS` defaults to `NEWS_MAX_EVENT_AGE_HOURS`, which defaults to `72`.
- `TRADE_NEWS_BREAKOUT_USD` and `LOSS_NEWS_BREAKOUT_USD` default to `500000`.
- `AI_MAX_COMPLETION_TOKENS` defaults to `2200`.

## Railway

Build uses the Dockerfile. Runtime command is `npm start`, and `/health` is the health check.
