import { Db, MongoClient } from 'mongodb';
import { loadConfig } from '../config.js';
import { getLogger } from '../logger.js';
import type { NewsArticleDoc, TradeOutcomeDoc } from '../shared/types.js';

let client: MongoClient | null = null;
let db: Db | null = null;

type TradeDoc = { _id: string; [key: string]: any };

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  const config = loadConfig();
  const log = getLogger();

  log.info({ db: config.mongoDb }, 'connecting to MongoDB');
  client = new MongoClient(config.mongoUri, {
    appName: 'polywhale-autonews',
  });
  await client.connect();
  db = client.db(config.mongoDb);
  log.info('MongoDB connected');
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB is not connected');
  return db;
}

export function articlesCollection() {
  return getDb().collection<NewsArticleDoc>('news_articles');
}

export function outcomesCollection() {
  return getDb().collection<TradeOutcomeDoc>('trade_outcomes');
}

export function tradesCollection() {
  return getDb().collection<TradeDoc>('trades');
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    getLogger().info('MongoDB connection closed');
  }
}
