// This file configures the initialization of Sentry for server-side and edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

/**
 * Log version information on server startup
 */
function logVersionInfo() {
  try {
    // Dynamically import VERSION_CONFIG to avoid build-time errors
    const {VERSION_CONFIG} = require('./src/config/version');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 FireAlert Server Starting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 CalVer:        ${VERSION_CONFIG.CALVER}`);
    console.log(`📦 SemVer:        ${VERSION_CONFIG.SEMVER}`);
    console.log(`🔢 Build Number:  ${VERSION_CONFIG.BUILD_NUMBER}`);
    console.log(`🌐 API Version:   ${VERSION_CONFIG.API_VERSION}`);
    console.log(`🔧 Environment:   ${process.env.NODE_ENV || 'development'}`);

    if (process.env.BYPASS_VERSION_CHECK === 'true') {
      console.log('⚠️  Version Check: BYPASSED (Development Mode)');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    // Silently fail if version config doesn't exist yet
    console.log(
      '⚠️  Version information not available (version config not generated)',
    );
  }
}

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Log version information on server startup
    logVersionInfo();

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
