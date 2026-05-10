# Polywhale Autonews

Automated news worker for Polywhale whale-trade and resolved-loss articles.

## What It Does

- Watches Redis `whales` for trades above `TRADE_NEWS_MIN_USD`.
- Watches Redis `market_resolutions` and creates articles for BUY losses above `LOSS_NEWS_MIN_USD`.
- Backfills from the public whale API and Mongo `trade_outcomes` so short outages do not lose stories.
- Uses MiniMax M2.7 for varied copy, with deterministic fallback templates.
- Serves `GET /v1/news`, `GET /v1/news/:slug`, `/news/:slug`, `/sitemap.xml`, `/news-sitemap.xml`, and `/rss.xml`.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MINIMAX_API_KEY` locally or in Railway. The service will still publish template articles if the key is absent and `AI_REQUIRE_SUCCESS=false`.

## Build

```powershell
npm test
npm run build
```

