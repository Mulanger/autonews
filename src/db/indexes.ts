import { articlesCollection } from './mongo.js';

export async function ensureIndexes(): Promise<void> {
  const articles = articlesCollection();
  await Promise.all([
    articles.createIndex({ triggerKey: 1 }, { unique: true }),
    articles.createIndex({ status: 1, publishedAt: -1 }),
    articles.createIndex({ kind: 1, publishedAt: -1 }),
    articles.createIndex({ 'facts.conditionId': 1, kind: 1 }),
    articles.createIndex({ 'facts.wallet': 1, publishedAt: -1 }),
  ]);
}

