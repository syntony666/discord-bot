import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { splitSql, analyzeSql, PLAN_FORMAT } from '../../../scripts/release-db.cjs';

// ---------- splitSql ----------

test('splitSql splits plain statements', () => {
  const stmts = splitSql('CREATE TABLE a (id int); CREATE TABLE b (id int);');
  assert.equal(stmts.length, 2);
  assert.match(stmts[0], /CREATE TABLE a/);
  assert.match(stmts[1], /CREATE TABLE b/);
});

test('splitSql keeps semicolons inside single-quoted strings', () => {
  const stmts = splitSql("INSERT INTO t VALUES ('a;b'); SELECT 1;");
  assert.equal(stmts.length, 2);
});

test('splitSql keeps semicolons inside escaped and dollar-quoted strings', () => {
  const stmts = splitSql("SELECT E'a\\';b'; SELECT $$x;y$$; SELECT $tag$u;v$tag$;");
  assert.equal(stmts.length, 3);
  assert.match(stmts[1], /\$\$x;y\$\$/);
  assert.match(stmts[2], /\$tag\$u;v\$tag\$/);
});

test('splitSql ignores comments and comment-only chunks', () => {
  const sql = '-- hello; world\n/* block; comment */\nSELECT 1;\n-- tail';
  const stmts = splitSql(sql);
  assert.equal(stmts.length, 1);
  assert.match(stmts[0], /SELECT 1/);
});

test('splitSql keeps semicolons inside quoted identifiers', () => {
  const stmts = splitSql('ALTER TABLE "we;ird" ADD COLUMN c TEXT; SELECT 2;');
  assert.equal(stmts.length, 2);
});

// ---------- analyzeSql: allowed ----------

test('analyzeSql allows CREATE SCHEMA IF NOT EXISTS public', () => {
  for (const sql of [
    'CREATE SCHEMA IF NOT EXISTS public;',
    'CREATE SCHEMA IF NOT EXISTS "public";',
  ]) {
    const r = analyzeSql(sql);
    assert.equal(r.ok, true, sql);
  }
});

test('analyzeSql allows new enum, new table, new-table constraints', () => {
  const r = analyzeSql(`
    CREATE TYPE "Role" AS ENUM ('A', 'B');
    CREATE TABLE "Member" ("id" TEXT NOT NULL, "role" "Role" NOT NULL);
    ALTER TABLE "Member" ADD CONSTRAINT "Member_pkey" PRIMARY KEY ("id");
    CREATE UNIQUE INDEX "Member_id_key" ON "Member"("id");
  `);
  assert.equal(r.ok, true, r.reason);
});

test('analyzeSql allows nullable column without default on existing table', () => {
  const r = analyzeSql('ALTER TABLE "Guild" ADD COLUMN "note" TEXT;');
  assert.equal(r.ok, true, r.reason);
});

test('analyzeSql allows plain index on existing table', () => {
  const r = analyzeSql('CREATE INDEX "Guild_name_idx" ON "Guild"("name");');
  assert.equal(r.ok, true, r.reason);
});

// ---------- analyzeSql: denied ----------

const denied = {
  'drop table': 'DROP TABLE "Guild";',
  'drop column': 'ALTER TABLE "Guild" DROP COLUMN "name";',
  rename: 'ALTER TABLE "Guild" RENAME TO "G2";',
  'change type': 'ALTER TABLE "Guild" ALTER COLUMN "name" TYPE INTEGER;',
  'set default': 'ALTER TABLE "Guild" ALTER COLUMN "name" SET DEFAULT \'x\';',
  'alter enum': 'ALTER TYPE "GuildTier" ADD VALUE \'VIP\';',
  'other schema': 'ALTER TABLE "auth"."users" ADD COLUMN "x" TEXT;',
  'create schema other': 'CREATE SCHEMA IF NOT EXISTS private;',
  'create table as select': 'CREATE TABLE "T2" AS SELECT * FROM "Guild";',
  'unique index on existing': 'CREATE UNIQUE INDEX "u" ON "Guild"("name");',
  'index concurrently': 'CREATE INDEX CONCURRENTLY "i" ON "Guild"("name");',
  'expression index': 'CREATE INDEX "i" ON "Guild"(lower("name"));',
  'constraint on existing': 'ALTER TABLE "Guild" ADD CONSTRAINT "c" UNIQUE ("name");',
  'fk on existing':
    'ALTER TABLE "Guild" ADD CONSTRAINT "f" FOREIGN KEY ("id") REFERENCES "X"("id");',
  'column with default': 'ALTER TABLE "Guild" ADD COLUMN "n" INTEGER DEFAULT 0;',
  'column not null': 'ALTER TABLE "Guild" ADD COLUMN "n" INTEGER NOT NULL;',
  'column with check': 'ALTER TABLE "Guild" ADD COLUMN "n" INTEGER CHECK (n > 0);',
  'mixed alter one bad': 'ALTER TABLE "Guild" ADD COLUMN "a" TEXT, DROP COLUMN "b";',
  'data move': 'INSERT INTO "A" SELECT * FROM "B";',
  truncate: 'TRUNCATE "Guild";',
};

for (const [name, sql] of Object.entries(denied)) {
  test(`analyzeSql denies: ${name}`, () => {
    const r = analyzeSql(sql);
    assert.equal(r.ok, false, sql);
  });
}

test('analyzeSql fails when diff exists but no statement parses', () => {
  const r = analyzeSql('-- only a comment\n');
  assert.equal(r.ok, false);
});

// ---------- apply state machine (fake CLI) ----------

const TOOL = new URL('../../../scripts/release-db.cjs', import.meta.url).pathname;

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function makePlanDir(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'release-db-'));
  const plan = {
    format: PLAN_FORMAT,
    hasChanges: sql != null,
    schemaSha256: sha256('schema'),
    sqlSha256: sha256(sql ?? ''),
  };
  if (sql != null) writeFileSync(join(dir, 'plan.sql'), sql);
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan));
  return dir;
}

// Fake CLI: responds to `migrate diff` and `db execute` by env vars.
function makeFakeCli(dir) {
  const cli = join(dir, 'fake-cli.cjs');
  writeFileSync(
    cli,
    `const fs = require('node:fs');
const [,, cmd, sub] = process.argv;
if (cmd === 'db' && sub === 'execute') {
  let d = ''; process.stdin.on('data', c => d += c).on('end', () => {
    if (process.env.FAKE_EXECUTE_KILL) process.kill(process.pid, 'SIGKILL');
    process.exit(Number(process.env.FAKE_EXECUTE_CODE || 0));
  });
} else if (cmd === 'migrate' && sub === 'diff') {
  const out = process.argv[process.argv.indexOf('--output') + 1];
  if (out && out !== 'undefined') fs.writeFileSync(out, process.env.FAKE_DIFF_SQL || '');
  process.exit(Number(process.env.FAKE_DIFF_CODE || 0));
} else { process.exit(9); }
`
  );
  chmodSync(cli, 0o755);
  return cli;
}

function runApply(dir, env = {}) {
  const cli = makeFakeCli(dir);
  return spawnSync('node', [TOOL, 'apply', '--plan', dir, '--cli', cli], {
    env: { ...process.env, DATABASE_URL: 'postgres://fake', ...env },
    encoding: 'utf-8',
  });
}

function readStatus(dir) {
  return JSON.parse(readFileSync(join(dir, 'status.json'), 'utf-8'));
}

test('apply writes UNCHANGED without executing when plan has no changes', () => {
  const dir = makePlanDir(null);
  const r = runApply(dir, { FAKE_EXECUTE_CODE: '7' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readStatus(dir).result, 'UNCHANGED');
});

test('apply reaches CHANGED when execute succeeds and post-diff is empty', () => {
  const dir = makePlanDir('ALTER TABLE "Guild" ADD COLUMN "note" TEXT;\n');
  const r = runApply(dir, { FAKE_DIFF_CODE: '0' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readStatus(dir).result, 'CHANGED');
});

test('apply keeps UNKNOWN when executor is killed mid-run', () => {
  const dir = makePlanDir('ALTER TABLE "Guild" ADD COLUMN "note" TEXT;\n');
  const r = runApply(dir, { FAKE_EXECUTE_KILL: '1' });
  assert.notEqual(r.status, 0);
  assert.equal(readStatus(dir).result, 'UNKNOWN');
});

test('apply keeps UNKNOWN when post-diff still shows the same drift', () => {
  const sql = 'ALTER TABLE "Guild" ADD COLUMN "note" TEXT;\n';
  const dir = makePlanDir(sql);
  const r = runApply(dir, { FAKE_DIFF_CODE: '2', FAKE_DIFF_SQL: sql });
  assert.notEqual(r.status, 0);
  assert.equal(readStatus(dir).result, 'UNKNOWN');
});
