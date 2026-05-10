import type { Collection } from 'mongodb';
import { articlesCollection } from '../mongo.js';
import type { ArticleEvent, NewsArticleDoc } from '../../shared/types.js';
import { GENERIC_TRADER_LABEL, isWalletLikeLabel, sanitizeWalletLabels } from '../../shared/format.js';
import { buildArticleImage } from '../../services/article_assets.js';
import {
  buildArticleByline,
  buildEditorialDisclosure,
  buildSourceLinks,
} from '../../services/article_sources.js';

export interface ArticleClaim {
  slug: string;
  inserted: boolean;
}

export async function claimArticle(
  event: ArticleEvent,
  quality: NewsArticleDoc['quality'],
): Promise<ArticleClaim> {
  const now = new Date();
  const col = articlesCollection();

  const seed: NewsArticleDoc = {
    _id: event.slug,
    slug: event.slug,
    triggerKey: event.triggerKey,
    kind: event.kind,
    status: 'generating',
    title: '',
    dek: '',
    body: [],
    tags: [],
    canonicalUrl: '',
    facts: event.facts,
    image: buildArticleImage(event),
    sourceLinks: buildSourceLinks(event),
    byline: buildArticleByline(),
    editorialDisclosure: buildEditorialDisclosure(),
    quality,
    source: event.source,
    ai: {
      provider: 'template',
      model: 'template',
      usedFallback: true,
    },
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await col.insertOne(seed);
    return { slug: event.slug, inserted: true };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return { slug: event.slug, inserted: false };
    }
    throw err;
  }
}

export async function publishArticle(
  slug: string,
  update: Pick<
    NewsArticleDoc,
    | 'title'
    | 'dek'
    | 'body'
    | 'tags'
    | 'canonicalUrl'
    | 'image'
    | 'sourceLinks'
    | 'byline'
    | 'editorialDisclosure'
    | 'quality'
    | 'ai'
  >,
): Promise<void> {
  await articlesCollection().updateOne(
    { _id: slug },
    {
      $set: {
        ...update,
        status: 'published',
        updatedAt: new Date(),
      },
    },
  );
}

export async function markArticleFailed(slug: string, message: string): Promise<void> {
  await articlesCollection().updateOne(
    { _id: slug },
    {
      $set: {
        status: 'failed',
        'ai.error': message,
        updatedAt: new Date(),
      },
    },
  );
}

export async function getArticleBySlug(slug: string): Promise<NewsArticleDoc | null> {
  const article = await articlesCollection().findOne({ _id: slug, status: 'published' });
  return article ? sanitizePublicArticle(article) : null;
}

export async function listPublishedArticles(limit = 25): Promise<NewsArticleDoc[]> {
  const articles = await articlesCollection()
    .find({ status: 'published' })
    .sort({ publishedAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();
  return articles.map(sanitizePublicArticle);
}

export async function listRecentNewsArticles(limit = 1000): Promise<NewsArticleDoc[]> {
  const articles = await articlesCollection()
    .find({ status: 'published' })
    .sort({ publishedAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 1000))
    .toArray();
  return articles.map(sanitizePublicArticle);
}

export async function findRecentSimilarArticle(
  event: ArticleEvent,
  since: Date,
): Promise<NewsArticleDoc | null> {
  const filters: Record<string, unknown>[] = [];

  if (event.facts.conditionId) {
    filters.push({ 'facts.conditionId': event.facts.conditionId });
  }

  if (event.facts.marketSlug) {
    filters.push({ 'facts.marketSlug': event.facts.marketSlug });
  }

  if (!filters.length) {
    filters.push({ 'quality.clusterKey': event.kind + ':' + event.facts.wallet });
  }

  const article = await articlesCollection().findOne(
    {
      status: { $in: ['generating', 'published'] },
      kind: event.kind,
      triggerKey: { $ne: event.triggerKey },
      publishedAt: { $gte: since },
      $or: filters,
    },
    {
      sort: { publishedAt: -1 },
    },
  );

  return article ? sanitizePublicArticle(article) : null;
}

export async function countArticlesByStatus(
  col: Collection<NewsArticleDoc> = articlesCollection(),
): Promise<Record<string, number>> {
  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

export function sanitizePublicArticle(article: NewsArticleDoc): NewsArticleDoc {
  const traderName = article.facts?.traderName;
  const sanitizedArticle = {
    ...article,
    title: sanitizeWalletLabels(article.title),
    dek: sanitizeWalletLabels(article.dek),
    body: article.body.map((paragraph) => sanitizeWalletLabels(paragraph)),
    facts: {
      ...article.facts,
      traderName: isWalletLikeLabel(traderName) ? GENERIC_TRADER_LABEL : traderName,
    },
    byline: article.byline ?? buildArticleByline(),
    editorialDisclosure: article.editorialDisclosure ?? buildEditorialDisclosure(),
    sourceLinks: article.sourceLinks?.length ? article.sourceLinks : buildSourceLinks(article),
  };
  return {
    ...sanitizedArticle,
    image: article.image ?? buildArticleImage(sanitizedArticle),
  };
}
