import pino from 'pino';
import { loadConfig } from './config.js';

let logger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (logger) return logger;
  const config = loadConfig();
  logger = pino({
    level: config.logLevel,
    base: {
      service: 'autonews',
      env: config.nodeEnv,
    },
  });
  return logger;
}

