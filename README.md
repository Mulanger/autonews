# Polywhale Autonews

Automated news worker for Polywhale whale-trade and resolved-loss articles.

## What It Does

- Watches Redis `whales` for trades above `TRADE_NEWS_MIN_USD`.
- Watches Redis `market_resolutions` and creates articles for BUY losses above `LOSS_NEWS_MIN_USD`.
- Backfills from the public whale API and Mongo `trade_outcomes` so short outages do not lose stories.
- Uses MiniMax M2.7 for fuller factual articles, with deterministic fallback templates.
- Applies a story-quality gate and recent-cluster suppression so repeated trades do not flood Google News with thin duplicate stories.
- Adds byline, editorial disclosure, source links, and a 1200x675 generated article image for every public article.
- Serves `GET /v1/news`, `GET /v1/news/:slug`, article image SVG routes, `/news/:slug`, `/sitemap.xml`, `/news-sitemap.xml`, and `/rss.xml`.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MINIMAX_API_KEY` locally or in Railway. The service will still publish template articles if the key is absent and `AI_REQUIRE_SUCCESS=false`.

Useful SEO quality controls:

- `NEWS_MIN_STORY_SCORE` defaults to `3`.
- `NEWS_DUPLICATE_WINDOW_MS` defaults to `21600000` (6 hours).
- `NEWS_MAX_EVENT_AGE_HOURS` defaults to `72`.
- `TRADE_NEWS_BREAKOUT_USD` and `LOSS_NEWS_BREAKOUT_USD` default to `500000`.
- `AI_MAX_COMPLETION_TOKENS` defaults to `2200`.

## Build

```powershell
npm test
npm run build
```
