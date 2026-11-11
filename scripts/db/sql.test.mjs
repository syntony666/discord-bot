import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitSql, analyzeSql } from './sql.cjs';

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
