import * as Sentry from '@sentry/nextjs';
import {env} from './src/env.mjs';
import {nodeProfilingIntegration} from '@sentry/profiling-node';

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  profilesSampleRate: 1,
  integrations: [
    // Add profiling integration to list of integrations
    nodeProfilingIntegration(),
  ],
});
