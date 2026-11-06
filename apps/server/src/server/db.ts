import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient, type Prisma} from '@/generated/prisma/client';

import {env} from '../env.mjs';
import {logger} from './logger';
import {toPgConnectionSettings} from './pgConnection';

const SLOW_QUERY_MS = 1000;

export function createPrismaClient(
  log: Prisma.PrismaClientOptions['log'] = ['error'],
) {
  // `||`: with SKIP_ENV_VALIDATION, env holds raw values, so a blank
  // DATABASE_PRISMA_URL must still fall back to DATABASE_URL.
  const url = env.DATABASE_PRISMA_URL || env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_PRISMA_URL or DATABASE_URL must be set');
  }
  // Prisma 7 talks to Postgres through node-postgres (`pg`). See
  // pgConnection.ts for how Prisma 5 URL options (SSL, pool) carry over.
  const {poolConfig, schema} = toPgConnectionSettings(url);
  const adapter = new PrismaPg(poolConfig, {schema});
  return new PrismaClient({adapter, log});
}

const globalForPrisma = globalThis as unknown as {prisma?: PrismaClient};

function createAppClient(): PrismaClient {
  if (!env.DATABASE_LOG_SLOWQUERY) {
    return createPrismaClient(['error']);
  }

  // Performance monitoring (only if enabled via environment variable).
  // Replaces the `$use` middleware, which Prisma 7 removed.
  const client = createPrismaClient([
    'error',
    {emit: 'event', level: 'query'},
  ]) as PrismaClient<'query'>;
  client.$on('query', event => {
    if (event.duration > SLOW_QUERY_MS) {
      const query = event.query.replace(/\s+/g, ' ').slice(0, 300);
      logger(
        `Slow query detected - Duration: ${event.duration}ms, Query: ${query}`,
        'warn',
      );
    }
  });
  return client as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createAppClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
