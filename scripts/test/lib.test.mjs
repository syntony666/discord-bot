import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  parseArgs,
  collectExternals,
  validateVersion,
  writeManifest,
  ARCHIVE_NAMES,
} from '../release/lib.mjs';

// ---------- parseArgs ----------

test('parseArgs requires --version, --sha, --out', () => {
  assert.throws(() => parseArgs(['build']), /--version/);
  assert.throws(() => parseArgs(['build', '--version', '5.3.1']), /--sha/);
  assert.throws(() => parseArgs(['build', '--version', '5.3.1', '--sha', 'abc1234']), /--out/);
});

test('parseArgs accepts a complete build invocation', () => {
  const a = parseArgs(['build', '--version', '5.3.1', '--sha', 'abc1234', '--out', '/tmp/x']);
  assert.equal(a.mode, 'build');
  assert.equal(a.version, '5.3.1');
  assert.equal(a.sha, 'abc1234');
  assert.equal(a.out, '/tmp/x');
});

test('parseArgs rejects malformed versions', () => {
  for (const v of ['5.3', 'v5.3.1', '5.03.1', '5.3.1-rc.1', 'x.y.z']) {
    assert.throws(() => parseArgs(['build', '--version', v, '--sha', 'abc1234', '--out', '/t']), v);
  }
});

test('validateVersion matches release/x.y.z and plain x.y.z', () => {
  assert.equal(validateVersion('5.3.1', '5.3.1'), true);
  assert.equal(validateVersion('release/5.3.1', '5.3.1'), true);
  assert.equal(validateVersion('5.3.2', '5.3.1'), false);
});

// ---------- collectExternals ----------

test('collectExternals keeps third-party deps, drops workspace deps', () => {
  const pkgs = [
    { dependencies: { '@discord-bot/shared': '*', hono: '^4.0.0', prisma: '^7.0.0' } },
    { dependencies: { '@discord-bot/discord-client': '*', rxjs: '^7.0.0' } },
  ];
  const ext = collectExternals(pkgs);
  assert.deepEqual([...ext].sort(), ['hono', 'prisma', 'rxjs']);
  assert.ok(!ext.has('@discord-bot/shared'));
  assert.ok(!ext.has('@discord-bot/discord-client'));
});

// ---------- writeManifest ----------

function makeArchive(dir, arch, buildJson) {
  const src = join(dir, `src-${arch}`);
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, 'build.json'), JSON.stringify(buildJson));
  const file = ARCHIVE_NAMES[arch];
  execFileSync('tar', ['-czf', join(dir, file), '-C', src, 'build.json']);
  return join(dir, file);
}

test('writeManifest emits release.json and SHA256SUMS for both archives', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  const base = {
    schemaVersion: 1,
    repository: 'syntony666/discord-bot',
    version: '5.3.1',
    commit: 'a'.repeat(40),
    nodeVersion: '24.15.0',
    schemaSha256: 'b'.repeat(64),
  };
  makeArchive(dir, 'arm64', { ...base, platform: 'linux', arch: 'arm64' });
  makeArchive(dir, 'x64', { ...base, platform: 'linux', arch: 'x64' });

  const { manifest, sums } = writeManifest(dir);
  assert.equal(manifest.version, '5.3.1');
  assert.equal(manifest.commit, 'a'.repeat(40));
  assert.equal(manifest.archives.length, 2);
  assert.deepEqual(manifest.archives.map((a) => a.arch).sort(), ['arm64', 'x64']);
  const names = manifest.archives.map((a) => a.file).sort();
  assert.deepEqual(names, ['discord-bot-linux-arm64.tar.gz', 'discord-bot-linux-x64.tar.gz']);

  const sumLines = sums.trim().split('\n').sort();
  assert.equal(sumLines.length, 3);
  assert.ok(sumLines.some((l) => l.endsWith('release.json')));
  assert.ok(sumLines.some((l) => l.endsWith('discord-bot-linux-arm64.tar.gz')));
});

test('writeManifest refuses when archives disagree on version or commit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  const base = {
    schemaVersion: 1,
    repository: 'syntony666/discord-bot',
    version: '5.3.1',
    commit: 'a'.repeat(40),
    nodeVersion: '24.15.0',
    schemaSha256: 'b'.repeat(64),
  };
  makeArchive(dir, 'arm64', { ...base, platform: 'linux', arch: 'arm64' });
  makeArchive(dir, 'x64', { ...base, version: '5.3.2', platform: 'linux', arch: 'x64' });
  assert.throws(() => writeManifest(dir), /version/);
});

test('writeManifest refuses when platform/arch inside build.json is wrong', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  const base = {
    schemaVersion: 1,
    repository: 'syntony666/discord-bot',
    version: '5.3.1',
    commit: 'a'.repeat(40),
    nodeVersion: '24.15.0',
    schemaSha256: 'b'.repeat(64),
  };
  makeArchive(dir, 'arm64', { ...base, platform: 'linux', arch: 'x64' });
  makeArchive(dir, 'x64', { ...base, platform: 'linux', arch: 'x64' });
  assert.throws(() => writeManifest(dir), /arch/);
});
