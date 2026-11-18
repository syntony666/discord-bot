// Asserts the release data on disk is complete for process.env.VERSION:
// bot package version, CHANGELOG section, stamped docs version, and no
// pending changesets. Used by start-release.sh (post-prepare) and by
// release.yml's detect step (post-merge sanity).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const v = process.env.VERSION;
if (!v) {
  console.error('::error::VERSION env is required');
  process.exit(1);
}
const esc = v.replace(/\./g, '\\.');

const pkg = JSON.parse(readFileSync('apps/bot/package.json', 'utf8'));
assert.equal(pkg.version, v, 'apps/bot/package.json must carry the target version');

assert.match(
  readFileSync('apps/bot/CHANGELOG.md', 'utf8'),
  new RegExp(`^## ${esc}\\b`, 'm'),
  `apps/bot/CHANGELOG.md has no section for ${v}`
);

assert.match(
  readFileSync('apps/doc/.vitepress/version.mts', 'utf8'),
  new RegExp(`BOT_VERSION = '${esc}'`),
  'docs footer version.mts was not stamped'
);

const pending = readdirSync('.changeset').filter((p) => p.endsWith('.md') && p !== 'README.md');
assert.equal(pending.length, 0, `unconsumed changesets: ${pending.join(', ')}`);

console.log(`release data for ${v} verified`);
