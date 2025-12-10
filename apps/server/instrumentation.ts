// This file configures the initialization of Sentry for server-side and edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Disable debug logging to reduce console noise
      // Set SENTRY_DEBUG=true in .env to enable debug logs when troubleshooting
      debug: process.env.SENTRY_DEBUG === 'true',

      // Set environment
      environment: process.env.NODE_ENV,

      // Reduce console output
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console') {
          return null;
        }
        return breadcrumb;
      },

      // Enable profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Integrations are automatically added by Sentry
      // Prisma, Postgres, and other integrations will be auto-discovered

      // Ignore common errors
      ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],

      beforeSend(event, hint) {
        // Filter out errors from health checks
        if (event.request?.url?.includes('/api/health')) {
          return null;
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Disable debug logging to reduce console noise
      // Set SENTRY_DEBUG=true in .env to enable debug logs when troubleshooting
      debug: process.env.SENTRY_DEBUG === 'true',

      // Set environment
      environment: process.env.NODE_ENV,
    });
  }
}

export function onRequestError(
  err: unknown,
  request: {
    path: string;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  },
) {
  Sentry.captureRequestError(err, request, context);
}
