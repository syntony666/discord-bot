import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { PLAN_FORMAT } from '../../../scripts/release-db.cjs';

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
