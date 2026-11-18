import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Drives scripts/release/start-release.sh against a fake GitHub: `origin` is a
// local bare repo, `gh` is a PATH stub reading pr-list.json from GH_FIXTURE,
// and PREPARE_CMD stands in for `npm ci && changeset version` (the real
// pipeline is covered by the changesets tool itself plus the post-verify).

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'release', 'start-release.sh');
const VERSION = '9.9.9';
const SOURCE = `release/${VERSION}`;
const TARGET = `changeset-release/${VERSION}`;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
const remoteHeads = (remote) =>
  execFileSync('git', ['ls-remote', '--heads', remote], { encoding: 'utf8' });

const GH_STUB = `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
const dir = process.env.GH_FIXTURE;
fs.appendFileSync(dir + '/gh-calls.log', JSON.stringify(args) + '\\n');
if (args[0] === 'pr' && args[1] === 'list') {
  const list = JSON.parse(fs.readFileSync(dir + '/pr-list.json', 'utf8'));
  const p = list[0];
  const jq = args[args.indexOf('--jq') + 1] || '';
  const m = /\\[[0-9]+\\]\\.(\\w+)/.exec(jq);
  process.stdout.write((p && m ? String(p[m[1]] ?? '') : '') + '\\n');
} else if (args[0] === 'pr' && args[1] === 'create') {
  const body = args[args.indexOf('--body') + 1];
  fs.writeFileSync(dir + '/pr-body.txt', body || '');
  process.stdout.write('https://example.test/pr/1\\n');
} else {
  process.exit(1);
}
`;

const FAKE_PREPARE = `#!/usr/bin/env bash
set -euo pipefail
node -e '
const fs = require("fs");
const v = process.env.VERSION;
const pkg = "apps/bot/package.json";
const j = JSON.parse(fs.readFileSync(pkg, "utf8"));
j.version = v;
fs.writeFileSync(pkg, JSON.stringify(j) + "\\n");
fs.appendFileSync("apps/bot/CHANGELOG.md", "\\n## " + v + "\\n\\n- fake\\n");
fs.writeFileSync(
  "apps/doc/.vitepress/version.mts",
  "export const BOT_VERSION = '"'"'" + v + "'"'"';\\n"
);
for (const f of fs.readdirSync(".changeset")) {
  if (f.endsWith(".md") && f !== "README.md") fs.rmSync(".changeset/" + f);
}
'
`;

function seedRepo(dir) {
  const w = (p, c) => {
    const f = path.join(dir, p);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, c);
  };
  w('package.json', '{"name":"seed","private":true,"workspaces":["apps/*"]}\n');
  w('package-lock.json', '{"lockfileVersion":3}\n');
  w('apps/bot/package.json', '{"name":"@discord-bot/bot","version":"9.9.8"}\n');
  w('apps/bot/CHANGELOG.md', '# @discord-bot/bot\n');
  w('apps/doc/.vitepress/version.mts', "export const BOT_VERSION = '9.9.8';\n");
  w('.changeset/README.md', '# changesets\n');
  w('.changeset/config.json', '{}\n');
  // start-release.sh shells out to the real verifier; ship it in the seed.
  w(
    'scripts/release/verify-release-data.js',
    readFileSync(path.join(REPO_ROOT, 'scripts', 'release', 'verify-release-data.js'), 'utf8')
  );
}

function addChangeset(dir, file = 'pending-fix.md') {
  writeFileSync(path.join(dir, '.changeset', file), '---\n"@discord-bot/bot": patch\n---\nfix\n');
}

function makeWorld(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'start-release-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const remote = path.join(base, 'remote.git');
  const seed = path.join(base, 'seed');
  const work = path.join(base, 'work');
  const fixture = path.join(base, 'fixture');
  const stubbin = path.join(base, 'bin');

  mkdirSync(fixture, { recursive: true });
  mkdirSync(stubbin, { recursive: true });
  writeFileSync(path.join(fixture, 'pr-list.json'), '[]');
  writeFileSync(path.join(fixture, 'gh-calls.log'), '');
  writeFileSync(path.join(stubbin, 'gh'), GH_STUB);
  chmodSync(path.join(stubbin, 'gh'), 0o755);
  writeFileSync(path.join(base, 'fake-prepare.sh'), FAKE_PREPARE);
  chmodSync(path.join(base, 'fake-prepare.sh'), 0o755);

  mkdirSync(seed, { recursive: true });
  seedRepo(seed);
  git(seed, 'init', '-q', '-b', 'master');
  git(seed, 'config', 'user.name', 't');
  git(seed, 'config', 'user.email', 't@t');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'init');
  execFileSync('git', ['init', '-q', '--bare', remote]);
  git(seed, 'push', '-q', remote, 'master');
  execFileSync('git', ['clone', '-q', remote, work]);
  git(work, 'config', 'user.name', 't');
  git(work, 'config', 'user.email', 't@t');

  const world = {
    base,
    remote,
    work,
    fixture,
    run(extraEnv = {}) {
      return spawnSync('bash', [SCRIPT], {
        cwd: work,
        encoding: 'utf8',
        env: {
          ...process.env,
          RELEASE_BRANCH: VERSION,
          GH_FIXTURE: fixture,
          PREPARE_CMD: `bash ${path.join(base, 'fake-prepare.sh')}`,
          PATH: `${stubbin}:${process.env.PATH}`,
          ...extraEnv,
        },
      });
    },
    calls() {
      return readFileSync(path.join(fixture, 'gh-calls.log'), 'utf8');
    },
    setPr(pr) {
      writeFileSync(path.join(fixture, 'pr-list.json'), JSON.stringify(pr ? [pr] : []));
    },
    heads() {
      return remoteHeads(remote);
    },
    remoteSha(ref) {
      const out = execFileSync('git', ['ls-remote', remote, ref], { encoding: 'utf8' });
      return out ? out.split(/\s+/)[0] : '';
    },
    pushSource(mutate) {
      git(work, 'checkout', '-qB', SOURCE, 'master');
      if (mutate) mutate(work);
      git(work, 'add', '-A');
      git(work, 'commit', '-q', '--allow-empty', '-m', 'source');
      git(work, 'push', '-qf', 'origin', `HEAD:refs/heads/${SOURCE}`);
      git(work, 'checkout', '-q', 'master');
      git(work, 'branch', '-qD', SOURCE);
      return world.remoteSha(`refs/heads/${SOURCE}`);
    },
    pushPrepared(atSha, mutate) {
      git(work, 'checkout', '-qB', TARGET, atSha);
      if (mutate) mutate(work);
      git(work, 'add', '-A');
      git(work, 'commit', '-qm', 'chore: release');
      git(work, 'push', '-qf', 'origin', `HEAD:refs/heads/${TARGET}`);
      git(work, 'checkout', '-q', 'master');
      git(work, 'branch', '-qD', TARGET);
      return world.remoteSha(`refs/heads/${TARGET}`);
    },
    prBody(sourceSha, preparedSha) {
      return `Source: ${SOURCE} at ${sourceSha}\nPrepared: ${preparedSha}\n`;
    },
  };
  return world;
}

test('rejects a malformed version input', (t) => {
  const w = makeWorld(t);
  for (const bad of ['05.1.0', '1.2.3-rc1', 'release/1.2', 'latest']) {
    const r = w.run({ RELEASE_BRANCH: bad });
    assert.equal(r.status, 1, `${bad}: ${r.stdout}`);
    assert.match(r.stderr, /must be x\.y\.z/);
  }
});

test('refuses when the version tag is already published', (t) => {
  const w = makeWorld(t);
  execFileSync('git', ['--git-dir', w.remote, 'tag', `@discord-bot/bot@${VERSION}`, 'master']);
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already exists/);
});

test('refuses a source branch missing from origin', (t) => {
  const w = makeWorld(t);
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /does not exist/);
});

test('refuses a source that lacks the latest master', (t) => {
  const w = makeWorld(t);
  w.pushSource(addChangeset);
  // master moves on after the release branch was cut
  git(w.work, 'checkout', '-q', 'master');
  appendFileSync(path.join(w.work, 'package.json'), '\n');
  git(w.work, 'commit', '-qam', 'new master work');
  git(w.work, 'push', '-q', 'origin', 'master');
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /latest master/);
});

test('refuses a source with no pending changesets', (t) => {
  const w = makeWorld(t);
  w.pushSource(() => {});
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no pending changesets/);
});

test('happy path prepares, pushes, opens a PR, deletes the source', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);

  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  assert.ok(preparedSha, 'prepared branch missing on remote');
  assert.equal(w.remoteSha(`refs/heads/${SOURCE}`), '', 'source was not deleted');

  // the prepared commit carries the bumped tree
  git(w.work, 'fetch', '-q', 'origin', `refs/heads/${TARGET}`);
  const pkgOut = git(w.work, 'show', 'FETCH_HEAD:apps/bot/package.json');
  assert.equal(JSON.parse(pkgOut).version, VERSION);

  const body = readFileSync(path.join(w.fixture, 'pr-body.txt'), 'utf8');
  assert.match(body, new RegExp(`^Source: ${SOURCE} at ${srcSha}$`, 'm'));
  assert.match(body, new RegExp(`^Prepared: ${preparedSha}$`, 'm'));
});

test('rerun with open PR and unmoved branches reuses without rewriting', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);

  // source is gone, PR open with recorded shas -> pure reuse
  w.setPr({ state: 'OPEN', url: 'https://example.test/pr/1', body: w.prBody(srcSha, preparedSha) });
  writeFileSync(path.join(w.fixture, 'gh-calls.log'), '');
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(w.remoteSha(`refs/heads/${TARGET}`), preparedSha, 'prepared was rewritten');
  assert.ok(!w.calls().includes('pr","create'), `unexpected pr create: ${w.calls()}`);
});

test('rerun reuses while the source is still up but unmoved', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  execFileSync('git', ['push', '-q', w.remote, `${srcSha}:refs/heads/${SOURCE}`], { cwd: w.work });
  w.setPr({ state: 'OPEN', url: 'u', body: w.prBody(srcSha, preparedSha) });
  writeFileSync(path.join(w.fixture, 'gh-calls.log'), '');
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(w.remoteSha(`refs/heads/${SOURCE}`), '', 'source should be deleted on rerun too');
});

test('rerun refuses when the source moved after preparation', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  const moved = w.pushSource(addChangeset);
  w.setPr({ state: 'OPEN', url: 'u', body: w.prBody(srcSha, preparedSha) });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /moved after preparation/);
  assert.equal(w.remoteSha(`refs/heads/${SOURCE}`), moved, 'source should stay put');
});

test('rerun refuses when the prepared branch was modified', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  w.pushPrepared(preparedSha, (dir) => appendFileSync(path.join(dir, 'package.json'), '\n'));
  w.setPr({ state: 'OPEN', url: 'u', body: w.prBody(srcSha, preparedSha) });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /never overwritten/);
});

test('refuses a rerun of an already merged release', (t) => {
  const w = makeWorld(t);
  w.pushSource(addChangeset);
  w.setPr({ state: 'MERGED', url: 'u', body: '' });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already merged/);
});

test('closed PR re-prepares when the prepared commit is untouched', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  execFileSync('git', ['push', '-q', w.remote, `${srcSha}:refs/heads/${SOURCE}`], { cwd: w.work });
  w.setPr({ state: 'CLOSED', url: 'u', body: w.prBody(srcSha, preparedSha) });
  writeFileSync(path.join(w.fixture, 'gh-calls.log'), '');
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  assert.ok(w.calls().includes('pr","create'), 'a fresh PR should be opened');
  assert.notEqual(w.remoteSha(`refs/heads/${TARGET}`), '', 'prepared branch not re-pushed');
});

test('closed PR refuses when the prepared branch was modified', (t) => {
  const w = makeWorld(t);
  const srcSha = w.pushSource(addChangeset);
  assert.equal(w.run().status, 0);
  const preparedSha = w.remoteSha(`refs/heads/${TARGET}`);
  w.pushPrepared(preparedSha, (dir) => appendFileSync(path.join(dir, 'package.json'), '\n'));
  execFileSync('git', ['push', '-q', w.remote, `${srcSha}:refs/heads/${SOURCE}`], { cwd: w.work });
  w.setPr({ state: 'CLOSED', url: 'u', body: w.prBody(srcSha, preparedSha) });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to overwrite/);
});
