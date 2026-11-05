import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient, type Prisma} from '@/generated/prisma/client';

import {env} from '../env.mjs';
import {logger} from './logger';

const SLOW_QUERY_MS = 1000;

/**
 * Prisma 7 talks to Postgres through node-postgres (`pg`).
 *
 * In pg 8, `sslmode=require` means "verify the certificate" (same as
 * verify-full). The old Prisma engine only encrypted and did not verify.
 * `uselibpqcompat=true` keeps the old behavior, so hosted databases with
 * their own CA keep working. Set `uselibpqcompat` in the URL yourself to
 * override this.
 */
function toPgConnectionString(url: string): string {
  const parsed = new URL(url);
  if (
    parsed.searchParams.has('sslmode') &&
    !parsed.searchParams.has('uselibpqcompat')
  ) {
    parsed.searchParams.set('uselibpqcompat', 'true');
  }
  return parsed.toString();
}

export function createPrismaClient(
  log: Prisma.PrismaClientOptions['log'] = ['error'],
) {
  const url = env.DATABASE_PRISMA_URL ?? env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_PRISMA_URL or DATABASE_URL must be set');
  }
  const adapter = new PrismaPg({connectionString: toPgConnectionString(url)});
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
