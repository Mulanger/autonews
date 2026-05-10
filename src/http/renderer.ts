import type { NewsArticleDoc } from '../shared/types.js';
import { compactUsd, displayDate, formatPrice, formatUsd } from '../shared/format.js';
import { escapeHtml } from '../shared/xml.js';

export function renderNewsIndexHtml(articles: NewsArticleDoc[]): string {
  const items = articles
    .map(
      (article) => `
        <a class="news-row" href="/news/${escapeHtml(article.slug)}">
          <span>${escapeHtml(article.kind === 'whale_loss' ? 'Resolved loss' : 'Whale trade')}</span>
          <strong>${escapeHtml(article.title)}</strong>
          <small>${escapeHtml(displayDate(Math.floor(article.publishedAt.getTime() / 1000)))}</small>
        </a>`,
    )
    .join('');

  return renderShell({
    title: 'Polywhale News',
    description: 'Latest Polymarket whale trade and resolved-loss stories.',
    canonical: 'https://www.polywhaletrades.com/news',
    body: `
      <main class="news-main">
        <p class="eyebrow">Polywhale News</p>
        <h1>Latest whale stories</h1>
        <p class="dek">Automated coverage of large Polymarket trades and resolved whale losses tracked by Polywhale.</p>
        <section class="news-list">${items || '<p class="muted">No articles published yet.</p>'}</section>
      </main>`,
  });
}

export function renderArticleHtml(article: NewsArticleDoc, related: NewsArticleDoc[]): string {
  const facts = article.facts;
  const body = article.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
  const image = article.image;
  const byline = article.byline?.name || 'Polywhale News Desk';
  const sources = (article.sourceLinks || [])
    .map((source) => `<a href="${escapeHtml(source.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(source.label)}</a>`)
    .join('');
  const relatedLinks = related
    .filter((item) => item.slug !== article.slug)
    .slice(0, 4)
    .map((item) => `<a href="/news/${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a>`)
    .join('');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    image: image
      ? [
          {
            '@type': 'ImageObject',
            url: image.url,
            width: image.width,
            height: image.height,
            caption: image.alt,
          },
        ]
      : undefined,
    mainEntityOfPage: article.canonicalUrl,
    author: { '@type': article.byline?.type || 'Organization', name: byline, url: article.byline?.url },
    publisher: {
      '@type': 'Organization',
      name: 'Polywhale',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.polywhaletrades.com/assets/polywatch-icon.png',
      },
    },
  };

  return renderShell({
    title: article.title,
    description: article.dek,
    canonical: article.canonicalUrl,
    imageUrl: image?.url,
    imageAlt: image?.alt,
    jsonLd,
    body: `
      <main class="news-main">
        <article class="article">
          <a class="back" href="/news">News</a>
          <p class="eyebrow">${escapeHtml(article.kind === 'whale_loss' ? 'Resolved whale loss' : 'Whale trade')}</p>
          <h1>${escapeHtml(article.title)}</h1>
          <p class="dek">${escapeHtml(article.dek)}</p>
          <div class="meta">
            <span>By ${escapeHtml(byline)}</span>
            <span>${escapeHtml(displayDate(Math.floor(article.publishedAt.getTime() / 1000)))}</span>
            <span>${escapeHtml(compactUsd(facts.lossUsd ?? facts.amountUsd))}</span>
            <span>${escapeHtml(facts.marketTitle)}</span>
          </div>
          ${
            image
              ? `<figure class="hero-image"><img src="${escapeHtml(image.url)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(image.alt)}"><figcaption>${escapeHtml(image.credit)}</figcaption></figure>`
              : ''
          }
          <section class="body">${body}</section>
          <p class="disclosure">${escapeHtml(article.editorialDisclosure || '')}</p>
          ${sources ? `<section class="sources"><h2>Sources</h2><div>${sources}</div></section>` : ''}
        </article>
      </main>
      <aside class="rail">
        <section>
          <h2>Trade facts</h2>
          <dl>
            <div><dt>Wallet</dt><dd>${escapeHtml(facts.traderName)}</dd></div>
            <div><dt>Size</dt><dd>${escapeHtml(formatUsd(facts.amountUsd))}</dd></div>
            <div><dt>Side</dt><dd>${escapeHtml(facts.side)} ${escapeHtml(facts.outcome)}</dd></div>
            <div><dt>Entry</dt><dd>${escapeHtml(formatPrice(facts.priceCents))}</dd></div>
            ${facts.lossUsd ? `<div><dt>Loss</dt><dd>${escapeHtml(formatUsd(facts.lossUsd))}</dd></div>` : ''}
          </dl>
        </section>
        <section>
          <h2>Keep reading</h2>
          <div class="related">${relatedLinks || '<span class="muted">More stories will appear here.</span>'}</div>
        </section>
      </aside>`,
  });
}

function renderShell(args: {
  title: string;
  description: string;
  canonical: string;
  body: string;
  jsonLd?: unknown;
  imageUrl?: string;
  imageAlt?: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.title)}</title>
  <meta name="description" content="${escapeHtml(args.description)}">
  <link rel="canonical" href="${escapeHtml(args.canonical)}">
  <link rel="icon" href="https://www.polywhaletrades.com/favicon.png">
  <meta property="og:title" content="${escapeHtml(args.title)}">
  <meta property="og:description" content="${escapeHtml(args.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(args.canonical)}">
  ${args.imageUrl ? `<meta property="og:image" content="${escapeHtml(args.imageUrl)}"><meta property="og:image:alt" content="${escapeHtml(args.imageAlt || args.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(args.imageUrl)}">` : ''}
  ${args.jsonLd ? `<script type="application/ld+json">${JSON.stringify(args.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
  <style>${css()}</style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="https://www.polywhaletrades.com/"><strong>Polywhale</strong><small>trades</small></a>
      <nav>
        <a href="https://www.polywhaletrades.com/">Live feed</a>
        <a href="https://www.polywhaletrades.com/leaderboard">Leaderboard</a>
        <a href="https://www.polywhaletrades.com/news" class="active">News</a>
        <a href="https://www.polywhaletrades.com/alerts">Alerts</a>
      </nav>
    </aside>
    ${args.body}
  </div>
</body>
</html>`;
}

function css(): string {
  return `
    :root { --bg:#07100d; --panel:#0b1210; --text:#eef8f4; --muted:rgba(238,248,244,.72); --soft:rgba(238,248,244,.48); --line:rgba(255,255,255,.08); --accent:#5ee7ad; --rose:#ff7b8a; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    a { color:inherit; text-decoration:none; }
    .shell { min-height:100vh; display:grid; grid-template-columns:242px minmax(0,1fr) 336px; background:radial-gradient(circle at 52% -18%, rgba(94,231,173,.08), transparent 34rem), var(--bg); }
    .sidebar { position:sticky; top:0; min-height:100vh; display:flex; flex-direction:column; gap:22px; padding:22px 16px; border-right:1px solid var(--line); background:rgba(7,11,12,.84); }
    .brand { display:flex; flex-direction:column; gap:2px; padding:6px 8px 18px; }
    .brand strong { font-size:18px; }
    .brand small { color:var(--soft); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    nav { display:grid; gap:4px; }
    nav a { min-height:42px; display:flex; align-items:center; border-radius:8px; padding:0 12px; color:var(--muted); font-size:13px; font-weight:800; }
    nav a.active { color:var(--accent); background:linear-gradient(90deg, rgba(94,231,173,.14), rgba(94,231,173,.02)); }
    .news-main { min-width:0; padding:34px 42px 72px; }
    .article { max-width:900px; }
    .back { display:inline-flex; margin-bottom:20px; color:var(--soft); font-size:12px; font-weight:900; }
    .eyebrow { margin:0 0 12px; color:var(--accent); font-size:11px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
    h1 { max-width:980px; margin:0; font-size:clamp(38px,5.4vw,76px); line-height:.96; letter-spacing:0; }
    .dek { max-width:780px; margin:18px 0 0; color:var(--muted); font-size:clamp(17px,2vw,22px); line-height:1.52; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    .meta span { min-height:28px; display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; padding:0 10px; color:var(--muted); background:rgba(255,255,255,.035); font-size:12px; font-weight:800; }
    .hero-image { max-width:820px; margin:28px 0 0; }
    .hero-image img { display:block; width:100%; height:auto; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.035); }
    .hero-image figcaption { margin-top:8px; color:var(--soft); font-size:11px; }
    .body { max-width:760px; margin-top:30px; }
    .body p { margin:0 0 18px; color:rgba(238,248,244,.76); font-size:16px; line-height:1.78; }
    .disclosure { max-width:760px; margin:26px 0 0; color:var(--soft); font-size:12px; line-height:1.55; }
    .sources { max-width:760px; margin-top:28px; }
    .sources h2 { margin:0 0 10px; color:var(--text); font-size:14px; }
    .sources div { display:flex; flex-wrap:wrap; gap:8px; }
    .sources a { min-height:30px; display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; padding:0 10px; color:var(--accent); background:rgba(94,231,173,.08); font-size:12px; font-weight:850; }
    .rail { min-width:0; padding:34px 22px; border-left:1px solid var(--line); background:rgba(7,11,12,.62); }
    .rail section { margin-bottom:28px; }
    .rail h2 { margin:0 0 12px; color:var(--text); font-size:14px; font-weight:900; }
    dl { display:grid; gap:8px; margin:0; }
    dl div, .related a, .news-row { display:grid; gap:5px; border:1px solid var(--line); border-radius:8px; padding:12px; background:rgba(255,255,255,.035); }
    dt { color:var(--soft); font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    dd { margin:0; color:var(--text); font-size:13px; font-weight:850; line-height:1.35; }
    .related { display:grid; gap:8px; }
    .related a { color:var(--muted); font-size:13px; font-weight:800; line-height:1.35; }
    .news-list { display:grid; gap:10px; max-width:860px; margin-top:34px; }
    .news-row strong, .news-row span, .news-row small { display:block; }
    .news-row span { color:var(--accent); font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .news-row strong { color:var(--text); font-size:18px; line-height:1.28; }
    .news-row small, .muted { color:var(--soft); font-size:12px; }
    @media (max-width:1020px) { .shell { display:block; } .sidebar, .rail { display:none; } .news-main { padding:24px 18px 72px; } h1 { font-size:38px; } }
  `;
}
