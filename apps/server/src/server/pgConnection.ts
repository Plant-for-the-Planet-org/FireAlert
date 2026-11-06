// Turns a Prisma 5 style Postgres URL into node-postgres (`pg`) settings for
// Prisma 7's PrismaPg adapter. Keep this file free of imports so it can be
// tested on its own.
import type {PoolConfig} from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// Modes where pg 8 is stricter than libpq (and Prisma 5): it verifies the
// certificate. `uselibpqcompat=true` gives them libpq meaning again.
const LIBPQ_COMPAT_MODES = new Set(['prefer', 'require', 'verify-ca']);

// Prisma 5 default `pool_timeout` (seconds).
const DEFAULT_POOL_TIMEOUT_S = 10;

const SAFE_SCHEMA = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface PgConnectionSettings {
  poolConfig: PoolConfig;
  /** Schema for PrismaPg's generated queries, from `?schema=`. */
  schema?: string;
}

/**
 * SSL, compared with Prisma 5:
 * - No `sslmode` and no PGSSLMODE: Prisma 5 tried TLS first, pg uses none.
 *   For non-local hosts we set `sslmode=require` (encrypt, no cert check).
 * - `sslmode=prefer|require|verify-ca`: we add `uselibpqcompat=true`, so
 *   pg follows libpq and does not verify the certificate for prefer/require
 *   (pg 8 alone treats them as verify-full).
 * - `sslmode=prefer` does not fall back to plain text in pg. A server
 *   without TLS rejects the connection; use `sslmode=disable` for it.
 * - `sslaccept=strict` (Prisma 5 option) becomes `sslmode=verify-full`.
 * - `sslmode=no-verify|verify-full|disable` are left as pg reads them.
 * - An explicit `uselibpqcompat` in the URL is never changed.
 *
 * Pool, compared with Prisma 5:
 * - `connection_limit` becomes the pool `max` (pg default is 10).
 * - `pool_timeout` (seconds, default 10) becomes `connectionTimeoutMillis`,
 *   so connecting or waiting for a free connection cannot hang forever.
 * - `schema` is passed to PrismaPg and set as `search_path` for raw SQL.
 */
export function toPgConnectionSettings(
  url: string,
  env: Record<string, string | undefined> = process.env,
): PgConnectionSettings {
  const parsed = new URL(url);
  const params = parsed.searchParams;

  // Prisma 5 URL options that pg does not understand.
  const schema = params.get('schema') || undefined;
  const connectionLimit = Number(params.get('connection_limit'));
  const poolTimeoutS = Number(params.get('pool_timeout'));
  const sslAccept = params.get('sslaccept');
  for (const key of ['schema', 'connection_limit', 'pool_timeout', 'sslaccept']) {
    params.delete(key);
  }

  if (
    !params.has('sslmode') &&
    !env.PGSSLMODE &&
    !LOCAL_HOSTS.has(parsed.hostname)
  ) {
    params.set('sslmode', 'require');
  }

  const sslMode = params.get('sslmode');
  if (!params.has('uselibpqcompat') && sslMode) {
    if (sslAccept === 'strict' && (sslMode === 'prefer' || sslMode === 'require')) {
      params.set('sslmode', 'verify-full');
    } else if (LIBPQ_COMPAT_MODES.has(sslMode)) {
      params.set('uselibpqcompat', 'true');
    }
  }

  const poolConfig: PoolConfig = {
    connectionString: parsed.toString(),
    connectionTimeoutMillis:
      (poolTimeoutS > 0 ? poolTimeoutS : DEFAULT_POOL_TIMEOUT_S) * 1000,
  };
  if (connectionLimit > 0) {
    poolConfig.max = connectionLimit;
  }
  if (schema && SAFE_SCHEMA.test(schema)) {
    poolConfig.options = `-c search_path=${schema}`;
  }

  return {poolConfig, schema};
}
