import { loadConfig } from './config.js';
import { getLogger } from './logger.js';
import { connectMongo, closeMongo } from './db/mongo.js';
import { ensureIndexes } from './db/indexes.js';
import { buildServer } from './http/server.js';
import { startRedisSubscriber, closeRedisSubscriber } from './redis/subscriber.js';
import { startBackfillLoop } from './jobs/backfill.js';

let shuttingDown = false;
let backfillTimer: NodeJS.Timeout | null = null;

async function main() {
  const config = loadConfig();
  const log = getLogger();

  await connectMongo();
  await ensureIndexes();

  const app = buildServer();
  await app.listen({ host: '0.0.0.0', port: config.port });
  log.info({ port: config.port }, 'autonews HTTP server listening');

  if (config.workerEnabled && config.redisSubscriberEnabled) {
    await startRedisSubscriber();
  }
  if (config.workerEnabled && config.backfillEnabled) {
    backfillTimer = startBackfillLoop(() => shuttingDown);
  }

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, 'shutting down');
    if (backfillTimer) clearInterval(backfillTimer);
    await closeRedisSubscriber();
    await app.close();
    await closeMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  getLogger().fatal({ err }, 'autonews failed to start');
  process.exit(1);
});

