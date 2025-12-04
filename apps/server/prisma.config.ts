import 'dotenv/config';
import {defineConfig, env} from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_PRISMA_URL'),
    shadowDatabaseUrl:
      env('DATABASE_URL_NON_POOLING_SHADOW') || env('DATABASE_URL_NON_POOLING'),
  },
});
