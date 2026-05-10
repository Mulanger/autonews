import { z } from 'zod';

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
  port: z.number().int().min(1).max(65535),

  publicSiteUrl: z.string().url(),
  apiBaseUrl: z.string().url(),

  mongoUri: z.string().min(1),
  mongoDb: z.string().min(1),
  redisUrl: z.string().min(1),
  whaleChannel: z.string().min(1),
  resolutionChannel: z.string().min(1),

  minimaxApiKey: z.string().optional(),
  minimaxBaseUrl: z.string().url(),
  minimaxModel: z.string().min(1),
  aiGenerationEnabled: z.boolean(),
  aiRequireSuccess: z.boolean(),
  aiMaxCompletionTokens: z.number().int().positive(),

  tradeNewsMinUsd: z.number().positive(),
  lossNewsMinUsd: z.number().positive(),
  newsMinStoryScore: z.number().int().min(0),
  newsDuplicateWindowMs: z.number().int().positive(),
  newsMaxEventAgeHours: z.number().int().positive(),
  tradeNewsBreakoutUsd: z.number().positive(),
  lossNewsBreakoutUsd: z.number().positive(),

  workerEnabled: z.boolean(),
  redisSubscriberEnabled: z.boolean(),
  backfillEnabled: z.boolean(),
  backfillIntervalMs: z.number().int().positive(),
  backfillLimit: z.number().int().positive(),
  maxArticlesPerBackfill: z.number().int().positive(),

  ingestSecret: z.string().optional(),
  corsOrigins: z.array(z.string().min(1)),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const raw = {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    port: intFromEnv(process.env['PORT'], 3000),

    publicSiteUrl: (process.env['PUBLIC_SITE_URL'] ?? 'https://www.polywhaletrades.com').replace(/\/$/, ''),
    apiBaseUrl: (process.env['API_BASE_URL'] ?? 'https://whaleserver-production.up.railway.app').replace(/\/$/, ''),

    mongoUri: process.env['MONGO_URI'] ?? '',
    mongoDb: process.env['MONGO_DB'] ?? 'polywatch',
    redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    whaleChannel: process.env['WHALE_CHANNEL'] ?? 'whales',
    resolutionChannel: process.env['RESOLUTION_CHANNEL'] ?? 'market_resolutions',

    minimaxApiKey: process.env['MINIMAX_API_KEY'] || undefined,
    minimaxBaseUrl: (process.env['MINIMAX_BASE_URL'] ?? 'https://api.minimax.io/v1').replace(/\/$/, ''),
    minimaxModel: process.env['MINIMAX_MODEL'] ?? 'MiniMax-M2.7',
    aiGenerationEnabled: boolFromEnv(process.env['AI_GENERATION_ENABLED'], true),
    aiRequireSuccess: boolFromEnv(process.env['AI_REQUIRE_SUCCESS'], false),
    aiMaxCompletionTokens: intFromEnv(process.env['AI_MAX_COMPLETION_TOKENS'], 2200),

    tradeNewsMinUsd: intFromEnv(process.env['TRADE_NEWS_MIN_USD'], 100000),
    lossNewsMinUsd: intFromEnv(process.env['LOSS_NEWS_MIN_USD'], 200000),
    newsMinStoryScore: intFromEnv(process.env['NEWS_MIN_STORY_SCORE'], 3),
    newsDuplicateWindowMs: intFromEnv(process.env['NEWS_DUPLICATE_WINDOW_MS'], 6 * 60 * 60 * 1000),
    newsMaxEventAgeHours: intFromEnv(process.env['NEWS_MAX_EVENT_AGE_HOURS'], 72),
    tradeNewsBreakoutUsd: intFromEnv(process.env['TRADE_NEWS_BREAKOUT_USD'], 500000),
    lossNewsBreakoutUsd: intFromEnv(process.env['LOSS_NEWS_BREAKOUT_USD'], 500000),

    workerEnabled: boolFromEnv(process.env['WORKER_ENABLED'], true),
    redisSubscriberEnabled: boolFromEnv(process.env['REDIS_SUBSCRIBER_ENABLED'], true),
    backfillEnabled: boolFromEnv(process.env['BACKFILL_ENABLED'], true),
    backfillIntervalMs: intFromEnv(process.env['BACKFILL_INTERVAL_MS'], 60000),
    backfillLimit: intFromEnv(process.env['BACKFILL_LIMIT'], 100),
    maxArticlesPerBackfill: intFromEnv(process.env['MAX_ARTICLES_PER_BACKFILL'], 20),

    ingestSecret: process.env['INGEST_SECRET'] || undefined,
    corsOrigins: (process.env['CORS_ORIGINS'] ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
