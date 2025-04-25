import { z } from "zod";

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z.object({
  DATABASE_URL: z.string().url().optional(),
  DATABASE_PRISMA_URL: process.env.VERCEL ? z.string().url() : z.string().url().optional(),
  DATABASE_URL_NON_POOLING: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.preprocess(
    // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
    // Since NextAuth.js automatically uses the VERCEL_URL if present.
    (str) => process.env.VERCEL_URL ?? (process.env.COOLIFY_FQDN ? `https://${process.env.COOLIFY_FQDN}` : str),
    // VERCEL_URL doesn't include `https` so it cant be validated as a URL
    process.env.VERCEL ? z.string().min(1) : z.string().url(),
  ),
  // Add `.min(1) on ID and SECRET if you want to make sure they're not empty

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
  EMAIL_FROM: z.string().default("FireAlert by Plant-for-the-Planet <firealert@plant-for-the-planet.org>"),
  
  // Plant-for-the-Planet API URL. Defaults to the main application URL if not provided.
  PLANET_API_URL: z.string().default("https://app.plant-for-the-planet.org"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  CRON_KEY: z.string().optional(),
  NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN: z.string().optional(),
  // WhatsApp configuration. If not provided, WhatsApp notifications will be disabled.
  WHATSAPP_ENDPOINT_URL: z.string().optional(),
  WHATSAPP_ENDPOINT_AUTH_TOKEN: z.string().optional(),
  // API caching configuration. Enabled by default in production, disabled in development.
  PUBLIC_API_CACHING: z.union([z.literal("true"), z.literal("false")]).optional()
    .transform((val) => {
      if (val === undefined) return process.env.NODE_ENV === "production";
      return val === "true";
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
  DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL : process.env.DATABASE_PRISMA_URL,
  DATABASE_URL_NON_POOLING: process.env.DATABASE_URL_NON_POOLING ? process.env.DATABASE_URL_NON_POOLING : process.env.DATABASE_URL,
  // DATABASE_PRISMA_URL is set by VERCEL POSTGRES and had pooling built in.
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_AUTH0_CLIENT_ID,
  NEXT_PUBLIC_AUTH0_ISSUER: process.env.AUTH0_ISSUER,
  NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  SMTP_URL: process.env.SMTP_URL,
  EMAIL_FROM: process.env.EMAIL_FROM,
  PLANET_API_URL: process.env.PLANET_API_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  CRON_KEY: process.env.CRON_KEY,
  NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN: process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN,
  WHATSAPP_ENDPOINT_URL: process.env.WHATSAPP_ENDPOINT_URL,
  WHATSAPP_ENDPOINT_AUTH_TOKEN: process.env.WHATSAPP_ENDPOINT_AUTH_TOKEN,
  PUBLIC_API_CACHING: process.env.PUBLIC_API_CACHING
};


// Don't touch the part below
// --------------------------

const merged = server.merge(client);

/** @typedef {z.input<typeof merged>} MergedInput */
/** @typedef {z.infer<typeof merged>} MergedOutput */
/** @typedef {z.SafeParseReturnType<MergedInput, MergedOutput>} MergedSafeParseReturn */

let env = /** @type {MergedOutput} */ (process.env);

if (!!process.env.SKIP_ENV_VALIDATION == false) {
  const isServer = typeof window === "undefined";

  const parsed = /** @type {MergedSafeParseReturn} */ (
    isServer
      ? merged.safeParse(processEnv) // on server we can validate all env vars
      : client.safeParse(processEnv) // on client we can only validate the ones that are exposed
  );

  if (parsed.success === false) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }

  env = new Proxy(parsed.data, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      // Throw a descriptive error if a server-side env var is accessed on the client
      // Otherwise it would just be returning `undefined` and be annoying to debug
      if (!isServer && !prop.startsWith("NEXT_PUBLIC_"))
        throw new Error(
          process.env.NODE_ENV === "production"
            ? "❌ Attempted to access a server-side environment variable on the client"
            : `❌ Attempted to access server-side environment variable '${prop}' on the client`,
        );
      return target[/** @type {keyof typeof target} */ (prop)];
    },
  });
}

export { env };
