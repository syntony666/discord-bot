#!/usr/bin/env node
// Build a release tarball for the current platform, or assemble the shared
// release manifest from both tarballs.
//
//   node scripts/release/build.js build --version 5.3.1 --sha <commit> --out <dir>
//   node scripts/release/build.js manifest --out <dir>   (dir holds both tarballs)

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHIVE_NAMES, die, parseArgs, readJson, sha256File, writeManifest } from './lib.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPOSITORY = 'syntony666/discord-bot';
const SCHEMA_VERSION = 1;
const NODE_MAJOR = '24';

const PACKAGED_WORKSPACES = ['apps/api', 'apps/bot', 'packages/shared', 'packages/discord-client'];

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
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
    execFileSync(process.execPath, ['node_modules/@prisma/engines/scripts/postinstall.js'], {
      cwd: stage,
      stdio: 'inherit',
    });

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
    for (const f of ['db/cli.js', 'db/sql.js', 'db/prisma.config.js']) {
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

const isMain =
  process.argv[1] != null &&
  path.basename(process.argv[1]) === 'build.js' &&
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
