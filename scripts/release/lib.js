#!/usr/bin/env node
// Pure helpers for build.js — argument parsing, externals
// collection, and the shared release manifest. No esbuild, git, or npm.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const ARCHIVE_NAMES = {
  arm64: 'discord-bot-linux-arm64.tar.gz',
  x64: 'discord-bot-linux-x64.tar.gz',
};

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const sha256File = (p) => sha256(readFileSync(p));

export function die(msg) {
  throw new Error(`build-release: ${msg}`);
}

export function parseArgs(argv) {
  const [mode = 'build', ...rest] = argv;
  if (mode !== 'build' && mode !== 'manifest') die(`unknown mode ${mode}`);
  const opts = { mode };
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    if (!k?.startsWith('--')) die(`unexpected argument ${k}`);
    opts[k.slice(2)] = rest[i + 1];
  }
  if (mode === 'build') {
    if (!opts.version) die('missing --version');
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(opts.version))
      die(`bad --version ${opts.version}`);
    if (!opts.sha) die('missing --sha <commit>');
    if (!/^[0-9a-f]{7,40}$/i.test(opts.sha)) die(`bad --sha ${opts.sha}`);
  }
  if (!opts.out) die('missing --out <dir>');
  return opts;
}

// Accepts 'x.y.z' or 'release/x.y.z' against the computed version.
export function validateVersion(input, computed) {
  const v = input?.startsWith('release/') ? input.slice(8) : input;
  return v === computed;
}

// Third-party dependency names to keep external in the esbuild bundles.
export function collectExternals(pkgJsons) {
  const out = new Set();
  for (const pkg of pkgJsons) {
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      if (!name.startsWith('@discord-bot/')) out.add(name);
    }
  }
  return out;
}

export function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function extractBuildJson(archive, dest) {
  mkdirSync(dest, { recursive: true });
  try {
    execFileSync('tar', ['-xzf', archive, '-C', dest, './build.json'], { stdio: 'pipe' });
  } catch {
    execFileSync('tar', ['-xzf', archive, '-C', dest, 'build.json']);
  }
  return readJson(path.join(dest, 'build.json'));
}

// Reads every archive in dir, checks they agree, writes release.json + SHA256SUMS.
export function writeManifest(dir) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'manifest-read-'));
  try {
    const archives = [];
    for (const [arch, file] of Object.entries(ARCHIVE_NAMES)) {
      const p = path.join(dir, file);
      if (!existsSync(p)) die(`missing ${file}`);
      const build = extractBuildJson(p, path.join(tmp, arch));
      archives.push({ arch, file, path: p, build });
    }
    return finishManifest(dir, archives);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function finishManifest(dir, archives) {
  const shared = [
    'schemaVersion',
    'repository',
    'version',
    'commit',
    'nodeVersion',
    'schemaSha256',
  ];
  const [first, ...rest] = archives;
  for (const a of rest) {
    for (const k of shared) {
      if (a.build[k] !== first.build[k])
        die(`archives disagree on ${k}: ${a.build[k]} vs ${first.build[k]}`);
    }
  }
  for (const a of archives) {
    if (a.build.platform !== 'linux') die(`${a.file}: platform is ${a.build.platform}`);
    if (a.build.arch !== a.arch) die(`${a.file}: arch is ${a.build.arch}, expected ${a.arch}`);
  }
  const manifest = {
    schemaVersion: first.build.schemaVersion,
    repository: first.build.repository,
    version: first.build.version,
    commit: first.build.commit,
    nodeVersion: first.build.nodeVersion,
    schemaSha256: first.build.schemaSha256,
    archives: archives.map((a) => ({ arch: a.arch, file: a.file, sha256: sha256File(a.path) })),
  };
  writeFileSync(path.join(dir, 'release.json'), JSON.stringify(manifest, null, 2));
  const lines = [
    ...archives.map((a) => `${sha256File(a.path)}  ${a.file}`),
    `${sha256File(path.join(dir, 'release.json'))}  release.json`,
  ];
  writeFileSync(path.join(dir, 'SHA256SUMS'), lines.join('\n') + '\n');
  return { manifest, sums: lines.join('\n') + '\n' };
}
