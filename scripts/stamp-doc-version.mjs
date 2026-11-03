// Writes the bot package version into apps/doc/.vitepress/version.mts.
// Runs after `changeset version` inside release.yml so the release PR also
// bumps the doc site footer and triggers a doc deploy.
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('apps/bot/package.json', 'utf8'));
writeFileSync(
  'apps/doc/.vitepress/version.mts',
  `export const BOT_VERSION = '${version}';\n`
);
