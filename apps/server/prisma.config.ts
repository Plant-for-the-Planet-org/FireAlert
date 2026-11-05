import 'dotenv/config';
import {defineConfig} from 'prisma/config';

// Migrations need a direct (non-pooled) connection. Fall back the same way
// src/env.mjs does. Use process.env, not env(), so `prisma generate` (run on
// every `yarn install`) still works when no database URL is set.
const migrationUrl =
  process.env.DATABASE_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.DATABASE_PRISMA_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
});
