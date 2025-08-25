import {PrismaClient} from '@prisma/client';

import {env} from '../env.mjs';
import {logger} from './logger';

const globalForPrisma = globalThis as unknown as {prisma: PrismaClient};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

// Add performance monitoring middleware (only if enabled via environment variable)
if (env.DATABASE_LOG_SLOWQUERY) {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;
    
    // Log queries that take longer than 1000ms
    if (duration > 1000) {
      const logMessage = `Slow query detected - Model: ${params.model}, Action: ${params.action}, Duration: ${duration}ms`;
      logger(logMessage, 'warn');
    }
    
    return result;
  });
}

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
