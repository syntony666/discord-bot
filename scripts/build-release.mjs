#!/usr/bin/env node
// Build a release tarball for the current platform, or assemble the shared
// release manifest from both tarballs.
//
//   node scripts/build-release.mjs build --version 5.3.1 --sha <commit> --out <dir>
//   node scripts/build-release.mjs manifest --out <dir>   (dir holds both tarballs)

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY = 'syntony666/discord-bot';
const SCHEMA_VERSION = 1;
const NODE_MAJOR = '24';

const WORKSPACES = [
  'apps/api',
  'apps/bot',
  'apps/doc',
  'packages/shared',
  'packages/discord-client',
];
const PACKAGED_WORKSPACES = ['apps/api', 'apps/bot', 'packages/shared', 'packages/discord-client'];

export const ARCHIVE_NAMES = {
  arm64: 'discord-bot-linux-arm64.tar.gz',
  x64: 'discord-bot-linux-x64.tar.gz',
};

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sha256File = (p) => sha256(readFileSync(p));

function die(msg) {
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

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

async function bundle(entry, outfile, stageRoot) {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    platform: 'node',
    format: 'cjs',
    target: `node${NODE_MAJOR}`,
    plugins: [
      {
        name: 'release-externals',
        setup(b) {
          // workspace sources are bundled; everything else resolves at runtime
          b.onResolve({ filter: /^[^./]/ }, (a) =>
            a.path.startsWith('@discord-bot/') ? undefined : { path: a.path, external: true }
          );
          // generated prisma client stays external — copied into the package as-is.
          // the emitted specifier must resolve inside the package, so map the
          // resolved repo path onto the same relative location under stageRoot.
          b.onResolve({ filter: /\.prisma(\/|$)/ }, (a) => {
            const abs = path.resolve(a.resolveDir, a.path);
            const packaged = path.join(stageRoot, path.relative(REPO_ROOT, abs));
            const rel = path.relative(path.dirname(outfile), packaged);
            const spec = rel.startsWith('./') || rel.startsWith('../') ? rel : `./${rel}`;
            return { path: spec, external: true };
          });
        },
      },
    ],
    logLevel: 'error',
  });
}

function checkSymlinks(root) {
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = path.join(dir, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) {
        const target = path.resolve(dir, readlinkSync(p));
        if (!target.startsWith(root)) {
          throw new Error(`symlink escapes package: ${p} -> ${target}`);
        }
      } else if (st.isDirectory()) {
        walk(p);
      }
    }
  };
  walk(root);
}

function copyPkgJsons(stage) {
  cpSync(path.join(REPO_ROOT, 'package-lock.json'), path.join(stage, 'package-lock.json'));
  const rootPkg = readJson(path.join(REPO_ROOT, 'package.json'));
  writeFileSync(path.join(stage, 'package.json'), JSON.stringify(rootPkg, null, 2));
  for (const ws of PACKAGED_WORKSPACES) {
    mkdirSync(path.join(stage, ws), { recursive: true });
    cpSync(path.join(REPO_ROOT, ws, 'package.json'), path.join(stage, ws, 'package.json'));
  }
  // apps/doc package.json must exist for npm ci to validate the lockfile,
  // but it is excluded from the workspace install below and removed after.
  mkdirSync(path.join(stage, 'apps/doc'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'apps/doc/package.json'), path.join(stage, 'apps/doc/package.json'));
}

async function build(opts) {
  const botPkg = readJson(path.join(REPO_ROOT, 'apps/bot/package.json'));
  if (botPkg.version !== opts.version)
    die(`bot version is ${botPkg.version}, expected ${opts.version}`);
  const head = git(['rev-parse', 'HEAD']);
  if (!head.startsWith(opts.sha)) die(`HEAD is ${head}, expected ${opts.sha}`);

  for (const entry of ['apps/api/dist/index.js', 'apps/bot/dist/index.js']) {
    if (!existsSync(path.join(REPO_ROOT, entry))) die(`${entry} missing — run npm run build first`);
  }

  mkdirSync(opts.out, { recursive: true });
  const outDir = path.resolve(opts.out);
  const stage = mkdtempSync(path.join(tmpdir(), 'release-build-'));
  try {
    copyPkgJsons(stage);
    const wsArgs = PACKAGED_WORKSPACES.flatMap((w) => {
      const name = readJson(path.join(REPO_ROOT, w, 'package.json')).name;
      return ['--workspace', name];
    });
    execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', ...wsArgs], {
      cwd: stage,
      stdio: 'inherit',
    });
    // remove the doc workspace stub — it is only needed for lockfile validation
    rmSync(path.join(stage, 'apps/doc'), { recursive: true, force: true });
    rmSync(path.join(stage, 'package-lock.json'), { force: true });

    // prisma engines postinstall was skipped: fetch the schema-engine binary
    // using prisma's own platform detection.
    execFileSync('node', ['node_modules/@prisma/engines/scripts/postinstall.js'], {
      cwd: stage,
      stdio: 'inherit',
    });

    const externals = collectExternals(
      PACKAGED_WORKSPACES.map((w) => readJson(path.join(REPO_ROOT, w, 'package.json')))
    );
    for (const app of ['api', 'bot']) {
      mkdirSync(path.join(stage, `apps/${app}/dist`), { recursive: true });
      await bundle(
        path.join(REPO_ROOT, `apps/${app}/dist/index.js`),
        path.join(stage, `apps/${app}/dist/index.js`),
        stage
      );
    }
    cpSync(
      path.join(REPO_ROOT, 'apps/api/dist/.prisma'),
      path.join(stage, 'apps/api/dist/.prisma'),
      { recursive: true }
    );
    mkdirSync(path.join(stage, 'prisma'), { recursive: true });
    cpSync(
      path.join(REPO_ROOT, 'apps/api/prisma/schema.prisma'),
      path.join(stage, 'prisma/schema.prisma')
    );
    mkdirSync(path.join(stage, 'scripts'), { recursive: true });
    for (const f of ['release-db.cjs', 'release-sql.cjs', 'prisma.config.cjs']) {
      cpSync(path.join(REPO_ROOT, 'scripts', f), path.join(stage, 'scripts', f));
    }

    // the packaged root package.json carries the release version for getBotVersion
    const stagedRoot = readJson(path.join(stage, 'package.json'));
    stagedRoot.version = opts.version;
    writeFileSync(path.join(stage, 'package.json'), JSON.stringify(stagedRoot, null, 2));

    const buildJson = {
      schemaVersion: SCHEMA_VERSION,
      repository: REPOSITORY,
      version: opts.version,
      commit: head,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      schemaSha256: sha256File(path.join(stage, 'prisma/schema.prisma')),
    };
    if (buildJson.platform !== 'linux') die(`unsupported platform ${buildJson.platform}`);
    if (!ARCHIVE_NAMES[buildJson.arch]) die(`unsupported arch ${buildJson.arch}`);
    if (buildJson.nodeVersion.split('.')[0] !== NODE_MAJOR)
      die(`node ${buildJson.nodeVersion} is not ${NODE_MAJOR}.x`);
    writeFileSync(path.join(stage, 'build.json'), JSON.stringify(buildJson, null, 2));

    checkSymlinks(stage);

    const file = ARCHIVE_NAMES[buildJson.arch];
    const dest = path.join(outDir, file);
    execFileSync('tar', ['-czf', dest, '-C', stage, '.']);
    console.log(`${file}`);
    console.log(`sha256: ${sha256File(dest)}`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
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

const isMain =
  process.argv[1] != null &&
  path.basename(process.argv[1]) === 'build-release.mjs' &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.mode === 'manifest') writeManifest(opts.out);
    else await build(opts);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
