// Run with: yarn server test:unit
// Checks the SSL / pool settings pg actually ends up with, using pg's own
// connection-string parser.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';

import {toPgConnectionSettings} from './pgConnection.ts';

const require = createRequire(import.meta.url);
const {parse} = require('pg-connection-string') as {
  parse: (url: string) => {ssl?: false | {rejectUnauthorized?: boolean}};
};

// pg warns about sslmode aliases on every parse; keep test output clean.
process.removeAllListeners('warning');
process.on('warning', () => {});

type Ssl = 'none' | 'off' | 'TLS, no cert check' | 'TLS, verify cert';

function effectiveSsl(url: string, env: Record<string, string> = {}): Ssl {
  const {poolConfig} = toPgConnectionSettings(url, env);
  const ssl = parse(poolConfig.connectionString as string).ssl;
  if (ssl === undefined) return 'none';
  if (ssl === false) return 'off';
  return ssl.rejectUnauthorized === false ? 'TLS, no cert check' : 'TLS, verify cert';
}

const cases: Array<[string, string, Ssl, Record<string, string>?]> = [
  ['local host, no sslmode', 'postgres://u:p@localhost:54321/d', 'none'],
  ['remote host, no sslmode', 'postgres://u:p@db.example.com/d', 'TLS, no cert check'],
  ['remote host, PGSSLMODE set', 'postgres://u:p@db.example.com/d', 'none', {PGSSLMODE: 'disable'}],
  ['?host= overrides a local URL host', 'postgresql://u:p@localhost/d?host=db.example.com', 'TLS, no cert check'],
  ['repeated ?host=: last one wins, like pg', 'postgresql://u:p@localhost/d?host=localhost&host=db.example.com', 'TLS, no cert check'],
  ['?host= Unix socket is local', 'postgresql://u:p@db.example.com/d?host=/var/run/postgresql', 'none'],
  ['sslmode=require', 'postgres://u:p@h/d?sslmode=require', 'TLS, no cert check'],
  ['sslmode=prefer', 'postgres://u:p@h/d?sslmode=prefer', 'TLS, no cert check'],
  ['sslmode=no-verify', 'postgres://u:p@h/d?sslmode=no-verify', 'TLS, no cert check'],
  ['sslmode=verify-full', 'postgres://u:p@h/d?sslmode=verify-full', 'TLS, verify cert'],
  ['sslmode=disable', 'postgres://u:p@h/d?sslmode=disable', 'off'],
  ['sslaccept=strict', 'postgres://u:p@h/d?sslmode=require&sslaccept=strict', 'TLS, verify cert'],
  ['sslaccept=strict beats uselibpqcompat=true', 'postgres://u:p@h/d?sslmode=require&sslaccept=strict&uselibpqcompat=true', 'TLS, verify cert'],
  ['explicit uselibpqcompat=false kept', 'postgres://u:p@h/d?sslmode=require&uselibpqcompat=false', 'TLS, verify cert'],
];

for (const [name, url, expected, env] of cases) {
  test(`ssl: ${name}`, () => {
    assert.equal(effectiveSsl(url, env), expected);
  });
}

test('pool: Prisma 5 options carry over', () => {
  const {poolConfig, schema} = toPgConnectionSettings(
    'postgres://u:p@localhost/d?connection_limit=3&pool_timeout=20&schema=fire',
    {},
  );
  assert.equal(poolConfig.max, 3);
  assert.equal(poolConfig.connectionTimeoutMillis, 20_000);
  assert.equal(schema, 'fire');
  assert.equal(poolConfig.options, '-c search_path=fire');
  assert.doesNotMatch(poolConfig.connectionString as string, /connection_limit|pool_timeout|schema/);
});

test('pool: defaults', () => {
  const {poolConfig, schema} = toPgConnectionSettings('postgres://u:p@localhost/d', {});
  assert.equal(poolConfig.max, undefined);
  assert.equal(poolConfig.connectionTimeoutMillis, 10_000);
  assert.equal(schema, undefined);
  assert.equal(poolConfig.options, undefined);
});
