import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { main, sync } from '../units/sync-units.mjs';

// deploy.sh vendors the systemd templates from scripts/units/*.conf via @embed
// markers; scripts/units/sync-units.mjs --check is the drift gate (plan §9.7).

test('deploy.sh embeds are in sync with scripts/units/*.conf', () => {
  execFileSync(process.execPath, ['scripts/units/sync-units.mjs', '--check'], {
    encoding: 'utf-8',
  });
});

test('sync() replaces the heredoc body after an @embed marker', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-units-'));
  writeFileSync(join(dir, 'unit.conf'), '[Unit]\nDescription=x\n');
  const before = ['fn() {', '  # @embed unit.conf', "  cat <<'EOF'", 'stale', 'EOF', '}', ''].join(
    '\n'
  );
  const { result, embedded } = sync(before, dir);
  assert.deepEqual([...embedded], ['unit.conf']);
  assert.equal(
    result,
    [
      'fn() {',
      '  # @embed unit.conf',
      "  cat <<'EOF'",
      '[Unit]',
      'Description=x',
      'EOF',
      '}',
      '',
    ].join('\n')
  );
});

test('sync() leaves non-embed heredocs and content untouched', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-units-'));
  const before = ['fn() {', "  cat <<'PY'", 'keep me', 'PY', '}', ''].join('\n');
  const { result } = sync(before, dir);
  assert.equal(result, before);
});

test('sync() throws on unterminated heredoc and missing conf', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-units-'));
  const open = ['fn() {', '  # @embed x.conf', "  cat <<'EOF'", 'EOF', '}'].join('\n');
  assert.throws(() => sync(open, dir), /x\.conf/);
  writeFileSync(join(dir, 'x.conf'), 'a\n');
  const unterminated = ['fn() {', '  # @embed x.conf', "  cat <<'EOF'", 'no end'].join('\n');
  assert.throws(() => sync(unterminated, dir), /unterminated/);
});

test('main --check fails on stale embeds and orphan conf files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-units-'));
  writeFileSync(join(dir, 'unit.conf'), '[Unit]\nnew\n');
  writeFileSync(
    join(dir, 'deploy.sh'),
    ['fn() {', '  # @embed unit.conf', "  cat <<'EOF'", 'stale', 'EOF', '}', ''].join('\n')
  );
  assert.equal(
    main(['--check'], dir, join(dir, 'deploy.sh')),
    1,
    'stale embed must fail the check'
  );
  assert.equal(main([], dir, join(dir, 'deploy.sh')), 0, 'sync rewrites the file');
  assert.match(readFileSync(join(dir, 'deploy.sh'), 'utf-8'), /\[Unit\]\nnew\nEOF/);
  assert.equal(main(['--check'], dir, join(dir, 'deploy.sh')), 0, 'synced file passes the check');
  writeFileSync(join(dir, 'orphan.conf'), '[Unit]\nunused\n');
  assert.equal(
    main(['--check'], dir, join(dir, 'deploy.sh')),
    1,
    'orphan conf without a marker must fail'
  );
});
