// This file configures the initialization of Sentry for server-side and edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import {env} from './src/env.mjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      profilesSampleRate: 1,
      integrations: [
        // TODO: Add profiling integration to list of integrations
        // new ProfilingIntegration(),
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      profilesSampleRate: 1,
      integrations: [
        // TODO: Add profiling integration to list of integrations
        // new ProfilingIntegration(),
      ],
    });
  }
}
