#!/usr/bin/env node

// Release database tool. Runs inside an unpacked release package.
//   plan   --out <dir>     produce SQL diff, check it, save plan.sql + plan.json
//   verify --plan <dir>    re-diff read-only; must match the saved plan
//   apply  --plan <dir>    execute the checked SQL in one transaction
// DB access goes through the packaged Prisma CLI; DATABASE_URL comes from the
// environment (systemd EnvironmentFile) and never appears in args or output.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { splitSql, analyzeSql } from './sql.js';

const PLAN_FORMAT = 1;
const PKG_ROOT = path.resolve(import.meta.dirname, '..', '..');
const CONFIG = 'scripts/db/prisma.config.js';
const SCHEMA = 'prisma/schema.prisma';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function fail(msg, code = 1) {
  console.error(`release-db: ${msg}`);
  process.exit(code);
}

function parseOpts(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) opts[a.slice(2)] = argv[++i];
    else opts._.push(a);
  }
  return opts;
}

function prismaArgs(opts, args) {
  const cli = opts.cli ?? path.join('node_modules', 'prisma', 'build', 'index.js');
  return [cli, ...args];
}

function runCli(opts, args, input) {
  const r = spawnSync('node', prismaArgs(opts, args), {
    cwd: PKG_ROOT,
    input,
    env: process.env,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return r;
}

// ---------- diff / plan / apply ----------

function diffOnce(opts, outFile) {
  const r = runCli(opts, [
    'migrate',
    'diff',
    '--config',
    CONFIG,
    '--from-config-datasource',
    '--to-schema',
    SCHEMA,
    '--script',
    '--exit-code',
    '--output',
    outFile,
  ]);
  if (r.error) return { code: -1, stderr: String(r.error) };
  return { code: r.status ?? -1, stderr: (r.stderr || '').slice(-2000) };
}

function cmdPlan(opts) {
  const out = opts.out;
  if (!out) fail('plan requires --out <dir>');
  fs.mkdirSync(out, { recursive: true });
  const sqlFile = path.join(out, 'plan.sql');
  const d = diffOnce(opts, sqlFile);
  if (d.code !== 0 && d.code !== 2) fail(`migrate diff failed (exit ${d.code})`);
  const hasChanges = d.code === 2;
  let sql = '';
  if (hasChanges) {
    sql = fs.readFileSync(sqlFile, 'utf-8');
    const a = analyzeSql(sql);
    if (!a.ok) fail(`plan rejected by policy\n${a.reason}`, 2);
    console.error(`release-db: plan ok, ${a.statements} statement(s)`);
  } else {
    fs.writeFileSync(sqlFile, '');
  }
  const schemaSha = sha256(fs.readFileSync(path.join(PKG_ROOT, SCHEMA)));
  const plan = {
    format: PLAN_FORMAT,
    hasChanges,
    schemaSha256: schemaSha,
    sqlSha256: sha256(sql),
    statements: hasChanges ? splitSql(sql).length : 0,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify(plan));
}

function writeStatus(dir, result, extra = {}) {
  const p = path.join(dir, 'status.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ result, at: new Date().toISOString(), ...extra }));
  fs.renameSync(tmp, p);
}

function readPlan(opts) {
  const dir = opts.plan;
  if (!dir) fail('requires --plan <dir>');
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf-8'));
  if (plan.format !== PLAN_FORMAT) fail(`unsupported plan format ${plan.format}`);
  return { dir, plan };
}

function cmdVerify(opts) {
  const { dir, plan } = readPlan(opts);
  const tmp = path.join(dir, `.verify-${process.pid}.sql`);
  const d = diffOnce(opts, tmp);
  if (d.code !== 0 && d.code !== 2) {
    fs.rmSync(tmp, { force: true });
    fail(`verify diff failed (exit ${d.code})`);
  }
  if (!plan.hasChanges) {
    fs.rmSync(tmp, { force: true });
    if (d.code === 0) {
      console.log('verify: still no diff');
      return;
    }
    fail('verify: diff appeared where plan expected none');
  }
  const now = fs.readFileSync(tmp, 'utf-8');
  fs.rmSync(tmp, { force: true });
  if (d.code === 0) fail('verify: diff already applied (plan SQL no longer pending)');
  if (sha256(now) !== plan.sqlSha256) fail('verify: pending diff no longer matches the plan');
  console.log('verify: pending diff matches plan');
}

function cmdApply(opts) {
  const { dir, plan } = readPlan(opts);
  if (!plan.hasChanges) {
    writeStatus(dir, 'UNCHANGED');
    console.log('apply: nothing to do (UNCHANGED)');
    return;
  }
  const sqlFile = path.join(dir, 'plan.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  if (sha256(sql) !== plan.sqlSha256) {
    writeStatus(dir, 'UNKNOWN', { error: 'sql checksum mismatch' });
    fail('plan.sql checksum mismatch — refusing to run');
  }

  // Point of no return: record UNKNOWN before touching the database.
  writeStatus(dir, 'UNKNOWN');

  const wrapped =
    'BEGIN;\n' +
    "SET LOCAL lock_timeout = '5s';\n" +
    "SET LOCAL statement_timeout = '60s';\n" +
    'SET LOCAL search_path = public, pg_catalog;\n' +
    sql +
    '\nCOMMIT;\n';

  const r = runCli(opts, ['db', 'execute', '--config', CONFIG, '--stdin'], wrapped);
  if (r.error || r.status !== 0) {
    // Connection lost, process killed, or unknown outcome: keep UNKNOWN.
    fail(`db execute did not confirm success — status stays UNKNOWN`, 3);
  }

  // Post-check: the diff must now be gone.
  const tmp = path.join(dir, `.post-${process.pid}.sql`);
  const d = diffOnce(opts, tmp);
  fs.rmSync(tmp, { force: true });
  if (d.code !== 0) {
    fail(`post-apply diff not empty (exit ${d.code}) — status stays UNKNOWN`, 3);
  }
  writeStatus(dir, 'CHANGED', { statements: plan.statements });
  console.log('apply: done (CHANGED)');
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseOpts(rest);
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set');
  switch (cmd) {
    case 'plan':
      return cmdPlan(opts);
    case 'verify':
      return cmdVerify(opts);
    case 'apply':
      return cmdApply(opts);
    default:
      fail('usage: cli.js plan --out <dir> | verify --plan <dir> | apply --plan <dir>');
  }
}

const isMain =
  process.argv[1] != null &&
  import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (isMain) main();

export { PLAN_FORMAT };
