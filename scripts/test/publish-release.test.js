import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Drives scripts/release/publish-release.sh against a fake GitHub: `origin` is
// a local bare repo for real tag pushes, `gh` is a PATH stub reading stateful
// fixtures from GH_FIXTURE. Plan §10: ordered uploads, rerun fills missing
// only, never overwrites, published releases are read-only.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'release', 'publish-release.sh');
const TAG = '@discord-bot/bot@1.2.3';
const VERSION = '1.2.3';
const FILES = [
  'discord-bot-linux-arm64.tar.gz',
  'discord-bot-linux-x64.tar.gz',
  'release.json',
  'SHA256SUMS',
];

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

const GH_STUB = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const dir = process.env.GH_FIXTURE;
fs.appendFileSync(dir + '/gh-calls.log', JSON.stringify(args) + '\\n');
const load = () => JSON.parse(fs.readFileSync(dir + '/release-state.json', 'utf8'));
const save = (s) => fs.writeFileSync(dir + '/release-state.json', JSON.stringify(s));
const cmd = args[0] + ' ' + args[1];
if (cmd === 'release view') {
  const s = load();
  if (!s.exists) { process.stderr.write('release not found\\n'); process.exit(1); }
  process.stdout.write(JSON.stringify({ isDraft: s.isDraft, assets: s.assets.map((n) => ({ name: n })) }));
} else if (cmd === 'release create') {
  const s = load(); s.exists = true; s.isDraft = args.includes('--draft'); save(s);
  process.stdout.write('https://example.test/r/1\\n');
} else if (cmd === 'release download') {
  const p = args[args.indexOf('-p') + 1];
  const out = args[args.indexOf('-O') + 1];
  const src = path.join(dir, 'assets', p);
  if (!fs.existsSync(src)) { process.stderr.write('asset not found\\n'); process.exit(1); }
  fs.copyFileSync(src, out);
} else if (cmd === 'release upload') {
  const f = args[args.length - 1];
  const s = load(); s.assets.push(path.basename(f)); save(s);
} else if (cmd === 'release edit') {
  const s = load(); if (args.includes('--draft=false')) s.isDraft = false; save(s);
} else {
  process.exit(1);
}
`;

function makeWorld(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'publish-release-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const remote = path.join(base, 'remote.git');
  const work = path.join(base, 'work');
  const fixture = path.join(base, 'fixture');
  const artifacts = path.join(base, 'artifacts');
  const stubbin = path.join(base, 'bin');

  mkdirSync(fixture, { recursive: true });
  mkdirSync(path.join(fixture, 'assets'), { recursive: true });
  mkdirSync(artifacts, { recursive: true });
  mkdirSync(stubbin, { recursive: true });
  writeFileSync(
    path.join(fixture, 'release-state.json'),
    '{"exists":false,"isDraft":false,"assets":[]}'
  );
  writeFileSync(path.join(fixture, 'gh-calls.log'), '');
  writeFileSync(path.join(stubbin, 'gh'), GH_STUB);
  chmodSync(path.join(stubbin, 'gh'), 0o755);
  for (const f of FILES) {
    writeFileSync(path.join(artifacts, f), `content-of-${f}`);
  }

  execFileSync('git', ['init', '-q', '--bare', remote]);
  mkdirSync(work, { recursive: true });
  git(work, 'init', '-q', '-b', 'master');
  git(work, 'config', 'user.name', 't');
  git(work, 'config', 'user.email', 't@t');
  // the script reads CHANGELOG for release notes
  mkdirSync(path.join(work, 'apps', 'bot'), { recursive: true });
  writeFileSync(
    path.join(work, 'apps', 'bot', 'CHANGELOG.md'),
    `# @discord-bot/bot\n\n## ${VERSION}\n\n- fix\n`
  );
  git(work, 'add', '-A');
  git(work, 'commit', '-qm', 'init');
  git(work, 'remote', 'add', 'origin', remote);
  git(work, 'push', '-q', 'origin', 'master');
  const sha = git(work, 'rev-parse', 'HEAD').trim();

  const world = {
    base,
    remote,
    work,
    fixture,
    sha,
    run(env = {}) {
      return spawnSync('bash', [SCRIPT], {
        cwd: work,
        encoding: 'utf8',
        env: {
          ...process.env,
          RELEASE_TAG: TAG,
          RELEASE_VERSION: VERSION,
          RELEASE_SHA: sha,
          ARTIFACT_DIR: artifacts,
          GH_FIXTURE: fixture,
          PATH: `${stubbin}:${process.env.PATH}`,
          ...env,
        },
      });
    },
    state() {
      return JSON.parse(readFileSync(path.join(fixture, 'release-state.json'), 'utf8'));
    },
    setState(s) {
      writeFileSync(path.join(fixture, 'release-state.json'), JSON.stringify(s));
    },
    putAsset(name, content = `content-of-${name}`) {
      writeFileSync(path.join(fixture, 'assets', name), content);
    },
    calls() {
      return readFileSync(path.join(fixture, 'gh-calls.log'), 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l).join(' '));
    },
    tagSha() {
      const out = execFileSync('git', ['ls-remote', '--tags', remote, `${TAG}^{}`], {
        encoding: 'utf8',
      });
      return out ? out.split(/\s+/)[0] : '';
    },
  };
  return world;
}

test('fresh publish: tags, drafts, uploads in order, publishes', (t) => {
  const w = makeWorld(t);
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(w.tagSha(), w.sha, 'tag not pushed at the merge sha');

  const uploads = w.calls().filter((c) => c.startsWith('release upload'));
  assert.deepEqual(
    uploads,
    FILES.map((f) => `release upload ${TAG} ${w.base}/artifacts/${f}`)
  );
  const s = w.state();
  assert.equal(s.isDraft, false, 'release stayed a draft');
  assert.deepEqual(s.assets.sort(), [...FILES].sort());
});

test('rerun on a partial draft fills only the missing assets', (t) => {
  const w = makeWorld(t);
  w.putAsset(FILES[0]);
  w.putAsset(FILES[1]);
  w.setState({ exists: true, isDraft: true, assets: [FILES[0], FILES[1]] });
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  const uploads = w.calls().filter((c) => c.startsWith('release upload'));
  assert.deepEqual(
    uploads.map((u) => path.basename(u.split(' ').pop())),
    [FILES[2], FILES[3]]
  );
  assert.equal(w.state().isDraft, false);
});

test('rerun on a complete published release is a no-op', (t) => {
  const w = makeWorld(t);
  for (const f of FILES) w.putAsset(f);
  w.setState({ exists: true, isDraft: false, assets: [...FILES] });
  const r = w.run();
  assert.equal(r.status, 0, r.stderr);
  assert.ok(
    !w.calls().some((c) => c.startsWith('release upload')),
    're-uploaded a published asset'
  );
});

test('refuses when the tag points at a different commit', (t) => {
  const w = makeWorld(t);
  git(w.work, 'commit', '-q', '--allow-empty', '-m', 'later');
  const other = git(w.work, 'rev-parse', 'HEAD').trim();
  git(w.work, 'tag', '-f', TAG, other);
  git(w.work, 'push', '-qf', 'origin', `refs/tags/${TAG}`);
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /never moved/);
});

test('refuses to overwrite a mismatched existing asset', (t) => {
  const w = makeWorld(t);
  w.putAsset(FILES[0], 'tampered-content');
  w.setState({ exists: true, isDraft: true, assets: [FILES[0]] });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to overwrite/);
  assert.equal(w.state().isDraft, true, 'release should stay a draft');
  assert.ok(!w.calls().some((c) => c.startsWith('release upload')));
});

test('refuses to touch a published release missing an asset', (t) => {
  const w = makeWorld(t);
  for (const f of FILES.slice(0, 3)) w.putAsset(f);
  w.setState({ exists: true, isDraft: false, assets: FILES.slice(0, 3) });
  const r = w.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already published but missing/);
  assert.ok(!w.calls().some((c) => c.startsWith('release upload')));
});
