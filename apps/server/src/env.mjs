import {z} from 'zod';

const coerceBooleanWithDefault = defaultValue =>
  z
    .preprocess(raw => {
      if (typeof raw === 'string') {
        // explicit check for "false" (case-insensitive) → false; everything else truthy → true
        return raw.toLowerCase() === 'false' ? false : true;
      }
      // if undefined (env not set), fall back to the default
      return defaultValue;
    }, z.boolean()) // now our schema is a boolean type
    .default(defaultValue); // defaultValue must match z.boolean()

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z.object({
  DATABASE_URL: z.string().url().optional(),
  DATABASE_PRISMA_URL: process.env.VERCEL
    ? z.string().url()
    : z.string().url().optional(),
  DATABASE_URL_NON_POOLING: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']),

  NEXT_PUBLIC_AUTH0_CLIENT_ID: z.string(),
  NEXT_PUBLIC_AUTH0_ISSUER: z.string(),
  NEXT_PUBLIC_AUTH0_DOMAIN: z.string(),
  // OneSignal configuration for push notifications. If not provided, push notifications will be disabled.
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  // If you want to use Twilio, you need to set the following variables
  // On Development App can be run without Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // SMTP configuration for email notifications. If not provided, email notifications will be disabled.
  SMTP_URL: z.string().url().optional(),
  // Email sender address. Required only if SMTP_URL is configured.
  EMAIL_FROM: z
    .string()
    .default(
      'FireAlert by Plant-for-the-Planet <firealert@plant-for-the-planet.org>',
    ),

  // Plant-for-the-Planet API URL. Defaults to the main application URL if not provided.
  PLANET_API_URL: z.string().default('https://app.plant-for-the-planet.org'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  CRON_KEY: z.string().optional(),
  NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // WhatsApp configuration. If not provided, WhatsApp notifications will be disabled.
  WHATSAPP_ENDPOINT_URL: z.string().optional(),
  WHATSAPP_ENDPOINT_AUTH_TOKEN: z.string().optional(),

  // Default is true (unless set "false") that means SMS/Whatsapp will be disabled
  ALERT_SMS_DISABLED: coerceBooleanWithDefault(true),
  ALERT_WHATSAPP_DISABLED: coerceBooleanWithDefault(true),

  // Database slow query logging. Disabled by default.
  DATABASE_LOG_SLOWQUERY: coerceBooleanWithDefault(false),

  // Notification batch size for processing notifications in batches. Defaults to 10.
  NOTIFICATION_BATCH_SIZE: z.string().default('10'),

  // API caching configuration. Enabled by default in production, disabled in development.
  PUBLIC_API_CACHING: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform(val => {
      if (val === undefined) return process.env.NODE_ENV === 'production';
      return val === 'true';
    }),

  // Feature flag for refactored geo-event-fetcher pipeline. Defaults to false for safe rollout.
  USE_REFACTORED_PIPELINE: coerceBooleanWithDefault(false),

  // NASA FIRMS API key for accessing fire/heat anomaly data. Optional - falls back to provider config if not set.
  FIRMS_MAP_KEY: z.string().optional(),

  // Provider processing concurrency limit. Defaults to 3 for optimal performance vs resource usage.
  PROVIDER_CONCURRENCY: z
    .string()
    .default('3')
    .transform(val => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('PROVIDER_CONCURRENCY must be a positive integer');
      }
      return parsed;
    }),

  // SiteIncident configuration for fire incident grouping and lifecycle management
  // Hours of inactivity before an incident is marked as resolved. Defaults to 6 hours.
  INCIDENT_RESOLUTION_HOURS: z
    .string()
    .default('6')
    .transform(val => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('INCIDENT_RESOLUTION_HOURS must be a positive integer');
      }
      return parsed;
    }),

  // Feature flag to enable/disable incident processing. Defaults to true.
  ENABLE_INCIDENT_PROCESSING: coerceBooleanWithDefault(true),

  // Batch size for incident resolution operations. Defaults to 100.
  INCIDENT_BATCH_SIZE: z
    .string()
    .default('100')
    .transform(val => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('INCIDENT_BATCH_SIZE must be a positive integer');
      }
      return parsed;
    }),
});

/**
 * Specify your client-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars. To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
const client = z.object({
  // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
 * middlewares) or client-side so we need to destruct manually.
 *
 * @type {Record<keyof z.infer<typeof server> | keyof z.infer<typeof client>, string | undefined>}
 */
const processEnv = {
  DATABASE_PRISMA_URL: process.env.DATABASE_PRISMA_URL,
  DATABASE_URL: process.env.DATABASE_URL
    ? process.env.DATABASE_URL
    : process.env.DATABASE_PRISMA_URL,
  DATABASE_URL_NON_POOLING: process.env.DATABASE_URL_NON_POOLING
    ? process.env.DATABASE_URL_NON_POOLING
    : process.env.DATABASE_URL,
  // DATABASE_PRISMA_URL is set by VERCEL POSTGRES and had pooling built in.
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_AUTH0_CLIENT_ID,
  NEXT_PUBLIC_AUTH0_ISSUER: process.env.AUTH0_ISSUER,
  NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  TWILIO_STATUS_CALLBACK_URL: process.env.TWILIO_STATUS_CALLBACK_URL,
  SMTP_URL: process.env.SMTP_URL,
  EMAIL_FROM: process.env.EMAIL_FROM,
  PLANET_API_URL: process.env.PLANET_API_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  CRON_KEY: process.env.CRON_KEY,
  NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN:
    process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN,
  WHATSAPP_ENDPOINT_URL: process.env.WHATSAPP_ENDPOINT_URL,
  WHATSAPP_ENDPOINT_AUTH_TOKEN: process.env.WHATSAPP_ENDPOINT_AUTH_TOKEN,
  ALERT_SMS_DISABLED: process.env.ALERT_SMS_DISABLED,
  ALERT_WHATSAPP_DISABLED: process.env.ALERT_WHATSAPP_DISABLED,
  DATABASE_LOG_SLOWQUERY: process.env.DATABASE_LOG_SLOWQUERY,
  PUBLIC_API_CACHING: process.env.PUBLIC_API_CACHING,
  NOTIFICATION_BATCH_SIZE: process.env.NOTIFICATION_BATCH_SIZE,
  USE_REFACTORED_PIPELINE: process.env.USE_REFACTORED_PIPELINE,
  FIRMS_MAP_KEY: process.env.FIRMS_MAP_KEY,
  PROVIDER_CONCURRENCY: process.env.PROVIDER_CONCURRENCY,
  INCIDENT_RESOLUTION_HOURS: process.env.INCIDENT_RESOLUTION_HOURS,
  ENABLE_INCIDENT_PROCESSING: process.env.ENABLE_INCIDENT_PROCESSING,
  INCIDENT_BATCH_SIZE: process.env.INCIDENT_BATCH_SIZE,
};

// Don't touch the part below
// --------------------------

const merged = server.merge(client);

/** @typedef {z.input<typeof merged>} MergedInput */
/** @typedef {z.infer<typeof merged>} MergedOutput */
/** @typedef {z.SafeParseReturnType<MergedInput, MergedOutput>} MergedSafeParseReturn */

let env = /** @type {MergedOutput} */ (process.env);

if (!!process.env.SKIP_ENV_VALIDATION == false) {
  const isServer = typeof window === 'undefined';

  const parsed = /** @type {MergedSafeParseReturn} */ (
    isServer
      ? merged.safeParse(processEnv) // on server we can validate all env vars
      : client.safeParse(processEnv) // on client we can only validate the ones that are exposed
  );

  if (parsed.success === false) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors,
    );
    throw new Error('Invalid environment variables');
  }

  env = new Proxy(parsed.data, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      // Throw a descriptive error if a server-side env var is accessed on the client
      // Otherwise it would just be returning `undefined` and be annoying to debug
      if (!isServer && !prop.startsWith('NEXT_PUBLIC_'))
        throw new Error(
          process.env.NODE_ENV === 'production'
            ? '❌ Attempted to access a server-side environment variable on the client'
            : `❌ Attempted to access server-side environment variable '${prop}' on the client`,
        );
      return target[/** @type {keyof typeof target} */ (prop)];
    },
  });
}

export {env};
