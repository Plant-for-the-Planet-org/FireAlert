// This file configures the initialization of Sentry for edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

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
