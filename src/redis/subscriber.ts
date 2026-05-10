import { Redis } from 'ioredis';
import { loadConfig } from '../config.js';
import { getLogger } from '../logger.js';
import type { ResolutionEventPayload, WhaleDto } from '../shared/types.js';
import { writeLossArticlesForResolution, writeTradeArticle } from '../services/article_writer.js';

let subscriber: Redis | null = null;

export async function startRedisSubscriber(): Promise<void> {
  if (subscriber) return;
  const config = loadConfig();
  const log = getLogger();

  subscriber = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    reconnectOnError: () => true,
  });

  subscriber.on('message', (channel: string, message: string) => {
    void handleMessage(channel, message);
  });

  await subscriber.subscribe(config.whaleChannel, config.resolutionChannel);
  log.info(
    { whales: config.whaleChannel, resolutions: config.resolutionChannel },
    'subscribed to Redis channels',
  );
}

export async function closeRedisSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
    getLogger().info('Redis subscriber closed');
  }
}

async function handleMessage(channel: string, message: string): Promise<void> {
  const config = loadConfig();
  const log = getLogger();

  try {
    const parsed = JSON.parse(message) as unknown;
    if (channel === config.whaleChannel) {
      await writeTradeArticle(normalizeWhaleMessage(parsed), 'redis');
      return;
    }
    if (channel === config.resolutionChannel) {
      await writeLossArticlesForResolution(parsed as ResolutionEventPayload, 'redis');
    }
  } catch (err) {
    log.warn({ err, channel }, 'failed to process Redis message');
  }
}

function normalizeWhaleMessage(raw: unknown): WhaleDto {
  const value = raw as Record<string, unknown>;
  const id = String(value.id ?? value._id ?? '');
  return {
    ...(value as unknown as WhaleDto),
    id,
  };
}
