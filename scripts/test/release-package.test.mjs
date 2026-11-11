import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Package acceptance test (plan §14.2). Runs against a real release tarball and a
// throwaway PostgreSQL 16 database. Missing required inputs is a failure, never a skip.

const REQUIRED_ENV = [
  'RELEASE_ARCHIVE',
  'RELEASE_MANIFEST',
  'RELEASE_CHECKSUMS',
  'TEST_DATABASE_URL',
];
for (const name of REQUIRED_ENV) {
  assert.ok(process.env[name], `missing required env ${name}`);
}

const ARCHIVE = process.env.RELEASE_ARCHIVE;
const MANIFEST = process.env.RELEASE_MANIFEST;
const CHECKSUMS = process.env.RELEASE_CHECKSUMS;
const DB_URL = process.env.TEST_DATABASE_URL;

const ARCH = /discord-bot-linux-(\w+)\.tar\.gz$/.exec(ARCHIVE)?.[1];
assert.ok(ARCH === 'arm64' || ARCH === 'x64', `unexpected archive name ${ARCHIVE}`);

const work = mkdtempSync(join(tmpdir(), `release-pkg-${ARCH}-`));
const pkg = join(work, 'pkg');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const sha256File = (p) => sha256(readFileSync(p));

const children = [];
function run(file, args, opts = {}) {
  const r = spawn(file, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  children.push(r);
  return r;
}
async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${label}: ${lastErr ?? ''}`);
}
async function getJson(url) {
  const res = await fetch(url);
  return { status: res.status, body: await res.json() };
}

let manifest;
let build;
let version;

test.before(async () => {
  // 1. SHA256SUMS must cover the archive and manifest, and both must verify.
  const sumLines = readFileSync(CHECKSUMS, 'utf-8').trim().split('\n');
  const sumFor = (file) => {
    const line = sumLines.find(
      (l) => l.trim().endsWith(` ${file}`) || l.trim().endsWith(` ${file}`)
    );
    assert.ok(line, `SHA256SUMS missing entry for ${file}`);
    return line.split(/\s+/)[0];
  };
  const archiveName = ARCHIVE.split('/').pop();
  assert.equal(sha256File(ARCHIVE), sumFor(archiveName), 'archive checksum mismatch');
  assert.equal(sha256File(MANIFEST), sumFor('release.json'), 'manifest checksum mismatch');
  assert.ok(!sumLines.some((l) => l.includes('SHA256SUMS')), 'SHA256SUMS must not list itself');

  // 2. Extract outside the repo; refuse hostile entries.
  execFileSync('mkdir', ['-p', pkg]);
  const listing = execFileSync('tar', ['-tzf', ARCHIVE], { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  for (const entry of listing) {
    assert.ok(!entry.startsWith('/'), `absolute path in archive: ${entry}`);
    assert.ok(!entry.split('/').includes('..'), `path escapes package dir: ${entry}`);
  }
  execFileSync('tar', ['-xzf', ARCHIVE, '-C', pkg]);

  // 3. Layout.
  for (const p of [
    'build.json',
    'package.json',
    'apps/api/dist/index.js',
    'apps/api/dist/.prisma',
    'apps/bot/dist/index.js',
    'prisma/schema.prisma',
    'tools/release-db.cjs',
    'tools/prisma.config.cjs',
    'node_modules/prisma/build/index.js',
  ]) {
    assert.ok(existsSync(join(pkg, p)), `missing ${p}`);
  }

  build = JSON.parse(readFileSync(join(pkg, 'build.json'), 'utf-8'));
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
});

test('build.json and release.json agree with the tag data', () => {
  assert.equal(build.schemaVersion, 1);
  assert.equal(build.repository, 'syntony666/discord-bot');
  assert.equal(build.platform, 'linux');
  assert.equal(build.arch, ARCH);
  assert.equal(build.nodeVersion.split('.')[0], '24');
  version = build.version;
  assert.ok(/^\d+\.\d+\.\d+$/.test(version), `bad version ${version}`);

  for (const k of [
    'repository',
    'version',
    'commit',
    'nodeVersion',
    'schemaVersion',
    'schemaSha256',
  ]) {
    assert.equal(manifest[k], build[k], `${k} differs between manifest and build.json`);
  }
  const entry = manifest.archives.find((a) => a.file === ARCHIVE.split('/').pop());
  assert.ok(entry, 'archive not listed in release.json');
  assert.equal(entry.arch, ARCH);
  assert.equal(entry.sha256, sha256File(ARCHIVE));
});

test('bundled entry points are self-contained minified bundles', () => {
  for (const p of ['apps/api/dist/index.js', 'apps/bot/dist/index.js']) {
    const code = readFileSync(join(pkg, p), 'utf-8');
    // no reference back into the source tree
    assert.ok(!code.includes('src/index.ts'), `${p} still references sources`);
  }
  // own packages must be bundled, not linked out of the package
  const ownLinks = [
    '@discord-bot/shared',
    '@discord-bot/discord-client',
    '@discord-bot/api',
    '@discord-bot/bot',
  ];
  for (const name of ownLinks) {
    const p = join(pkg, 'node_modules', name);
    if (existsSync(p)) {
      const target = execFileSync('readlink', ['-f', p], { encoding: 'utf-8' }).trim();
      assert.ok(target.startsWith(pkg), `${name} points outside the package: ${target}`);
    }
  }
});

test('prisma db push + Guild CRUD on the test database', async () => {
  const env = { ...process.env, DATABASE_URL: DB_URL, NODE_PATH: '', NODE_OPTIONS: '' };
  execFileSync(
    'node',
    ['node_modules/prisma/build/index.js', 'db', 'push', '--config', 'tools/prisma.config.cjs'],
    { cwd: pkg, env, encoding: 'utf-8', timeout: 120_000 }
  );

  const script = `
    const { PrismaClient } = require('./apps/api/dist/.prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    (async () => {
      const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      });
      const id = 'pkg-test-' + Date.now();
      await prisma.guild.create({ data: { id, name: 'pkg test' } });
      const found = await prisma.guild.findUnique({ where: { id } });
      if (!found) throw new Error('row not found');
      await prisma.guild.update({ where: { id }, data: { name: 'updated' } });
      await prisma.guild.delete({ where: { id } });
      const gone = await prisma.guild.findUnique({ where: { id } });
      if (gone) throw new Error('row still present');
      await prisma.$disconnect();
      console.log('CRUD ok');
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync('node', ['-e', script], {
    cwd: pkg,
    env,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  assert.match(out, /CRUD ok/);
});

const API_PORT = process.env.API_PORT ?? '39101';
const HEALTH_PORT = process.env.HEALTH_PORT ?? '39100';
const API_URL = process.env.API_URL ?? `http://localhost:${API_PORT}`;

test('packaged API serves /health', async () => {
  const env = {
    ...process.env,
    NODE_PATH: '',
    NODE_OPTIONS: '',
    NODE_ENV: 'production',
    DATABASE_URL: DB_URL,
    API_PORT,
  };
  const child = run('node', ['apps/api/dist/index.js'], { cwd: pkg, env });
  child.stderr.on('data', (d) => process.stderr.write(`[api] ${d}`));
  const res = await waitFor(
    async () => {
      const r = await getJson(`http://localhost:${API_PORT}/health`);
      return r.status === 200 ? r.body : null;
    },
    30_000,
    'api /health'
  );
  assert.deepEqual(res, { ok: true, service: 'discord-bot-api' });
});

test('packaged bot boots with fake Discord, reports packaged version via /status', async () => {
  // Fake Discord: replace @discordjs/rest REST and @discordjs/ws WebSocketManager only.
  const log = join(work, 'discord-log.jsonl');
  const shim = join(work, 'fake-discord.cjs');
  writeFileSync(
    shim,
    `
const fs = require('node:fs');
const Module = require('module');
const EventEmitter = require('events');
const LOG = process.env.FAKE_DISCORD_LOG;
const record = (obj) => fs.appendFileSync(LOG, JSON.stringify(obj) + '\\n');

const ALLOWED = [
  /\\/users\\/[^/]+/,
  /\\/applications\\/[^/]+\\/commands/,
  /\\/oauth2\\/applications\\/@me/,
  /\\/interactions\\/[^/]+\\/[^/]+\\/callback/,
  /\\/webhooks\\/[^/]+\\/[^/]+\\/messages\\/(%40|@)original/,
  /\\/webhooks\\/[^/]+\\/[^/]+$/,
];

class FakeREST {
  constructor() {}
  setToken() { return this; }
  async request(method, path, opts) {
    const url = typeof path === 'string' ? path : path?.full ?? String(path);
    if (!ALLOWED.some((re) => re.test(url))) {
      record({ type: 'denied', method, url });
      throw new Error('fake discord: unexpected request ' + method + ' ' + url);
    }
    record({ type: 'request', method, url, body: opts?.body });
    if (/oauth2\\/applications\\/@me/.test(url)) return { id: '999888777' };
    if (/application.*commands/.test(url)) return method === 'PUT' ? [] : [];
    if (/\\/users\\//.test(url)) return { id: '999888777', username: 'pkg-bot', avatar: null, bot: true };
    return {};
  }
  get(p, o) { return this.request('GET', p, o); }
  post(p, o) { return this.request('POST', p, o); }
  put(p, o) { return this.request('PUT', p, o); }
  patch(p, o) { return this.request('PATCH', p, o); }
  delete(p, o) { return this.request('DELETE', p, o); }
}

const EV = { Dispatch: 'dispatch', Ready: 'ready', HeartbeatComplete: 'heartbeatComplete', Debug: 'debug' };

class FakeWS extends EventEmitter {
  constructor(opts) { super(); this.opts = opts; }
  async connect() {
    setTimeout(() => {
      this.emit(EV.Ready, { user: { id: '999888777', username: 'pkg-bot', avatar: null, bot: true } }, 0);
      setTimeout(() => {
        this.emit(EV.Dispatch, {
          t: 'INTERACTION_CREATE',
          d: {
            id: '111222333',
            application_id: '999888777',
            type: 2,
            token: 'fake-interaction-token',
            version: 1,
            guild_id: '444555666',
            member: { user: { id: '12345' }, roles: [], permissions: '8' },
            data: {
              id: 'cmd1', name: 'status', type: 1,
              options: [{ type: 1, name: 'bot' }],
            },
          },
        }, 0);
      }, 1000);
    }, 500);
    return [];
  }
  async getShardIds() { return [0]; }
  async send() {}
  async destroy() {}
}

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === '@discordjs/rest') {
    return { ...origLoad.apply(this, [request, ...rest]), REST: FakeREST };
  }
  if (request === '@discordjs/ws') {
    return {
      ...origLoad.apply(this, [request, ...rest]),
      WebSocketManager: FakeWS,
      WebSocketShardEvents: EV,
    };
  }
  return origLoad.apply(this, [request, ...rest]);
};
`
  );

  const env = {
    ...process.env,
    NODE_PATH: '',
    NODE_OPTIONS: '',
    NODE_ENV: 'production',
    DISCORD_TOKEN: 'fake-token',
    DISCORD_APP_ID: '999888777',
    API_URL,
    HEALTH_PORT,
    FAKE_DISCORD_LOG: log,
  };
  const child = run('node', ['-r', shim, 'apps/bot/dist/index.js'], { cwd: pkg, env });
  child.stderr.on('data', (d) => process.stderr.write(`[bot] ${d}`));

  const status = await waitFor(
    async () => {
      const r = await getJson(`http://localhost:${HEALTH_PORT}/status`);
      return r.body?.checks?.api?.ok && r.body?.checks?.discord?.ok ? r.body : null;
    },
    60_000,
    'bot /status ready'
  );
  assert.equal(status.status, 'ok');

  // The fake gateway sends one /status bot interaction; the reply footer must
  // carry the packaged version, checked from the intercepted request body.
  const reply = await waitFor(
    () => {
      if (!existsSync(log)) return null;
      const lines = readFileSync(log, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
      assert.ok(!lines.some((l) => l.type === 'denied'), 'unexpected Discord request was made');
      const hit = lines.find(
        (l) =>
          l.type === 'request' &&
          /interactions\/.+\/callback|webhooks\/.+messages/.test(l.url) &&
          JSON.stringify(l.body).includes('ver.')
      );
      return hit ?? null;
    },
    60_000,
    'interaction reply with version footer'
  );
  assert.match(JSON.stringify(reply.body), new RegExp(`ver\\. ${version.replaceAll('.', '\\.')}`));
});

test.after(() => {
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {}
  }
});
