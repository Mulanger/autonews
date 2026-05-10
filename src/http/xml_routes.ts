import type { NewsArticleDoc } from '../shared/types.js';
import { escapeXml } from '../shared/xml.js';

export function buildSitemapXml(articles: NewsArticleDoc[]): string {
  const urls = articles
    .map((article) => {
      return [
        '  <url>',
        `    <loc>${escapeXml(article.canonicalUrl)}</loc>`,
        `    <lastmod>${article.updatedAt.toISOString()}</lastmod>`,
        '    <changefreq>daily</changefreq>',
        '    <priority>0.72</priority>',
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildGoogleNewsSitemapXml(articles: NewsArticleDoc[]): string {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const newsUrls = articles
    .filter((article) => article.publishedAt.getTime() >= cutoff)
    .map((article) => {
      return [
        '  <url>',
        `    <loc>${escapeXml(article.canonicalUrl)}</loc>`,
        '    <news:news>',
        '      <news:publication>',
        '        <news:name>Polywhale</news:name>',
        '        <news:language>en</news:language>',
        '      </news:publication>',
        `      <news:publication_date>${article.publishedAt.toISOString()}</news:publication_date>`,
        `      <news:title>${escapeXml(article.title)}</news:title>`,
        '    </news:news>',
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${newsUrls}\n</urlset>\n`;
}

export function buildRssXml(articles: NewsArticleDoc[]): string {
  const items = articles
    .map((article) => {
      return [
        '    <item>',
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(article.canonicalUrl)}</link>`,
        `      <guid>${escapeXml(article.canonicalUrl)}</guid>`,
        `      <pubDate>${article.publishedAt.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(article.dek)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Polywhale News</title>',
    '    <link>https://www.polywhaletrades.com/news</link>',
    '    <description>Automated Polymarket whale trade and resolution news from Polywhale.</description>',
    ...items.split('\n'),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

