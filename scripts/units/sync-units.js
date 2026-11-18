#!/usr/bin/env node
// Regenerates the @embed'd heredoc bodies in deploy.sh from the *.conf files
// in this directory.
// The conf files are the canonical systemd templates; deploy.sh is standalone
// on the VM, so their contents are vendored in as generated regions.
//
//   node scripts/units/sync-units.js           rewrite deploy.sh in place
//   node scripts/units/sync-units.js --check   exit 1 if deploy.sh is stale
//
// A marker is a comment `# @embed <file>` on the line before a heredoc
// opener (`<<'TAG'` or `<<TAG`); everything between opener and terminator
// is replaced by the file's contents.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const DEPLOY = join(DIR, '..', 'deploy.sh');

export function sync(deploySh, dir) {
  const lines = deploySh.split('\n');
  const out = [];
  const embedded = new Set();
  let i = 0;
  while (i < lines.length) {
    out.push(lines[i]);
    const m = /^\s*# @embed (\S+\.conf)\s*$/.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const file = m[1];
    embedded.add(file);
    // locate the heredoc opener on the next non-empty line
    let j = i + 1;
    let tag;
    while (j < lines.length) {
      const h = /<<'?([A-Z_]+)'?/.exec(lines[j]);
      if (h) {
        tag = h[1];
        break;
      }
      if (lines[j].trim() !== '') break;
      j++;
    }
    if (tag === undefined) throw new Error(`no heredoc opener after @embed ${file}`);
    while (i < j) {
      i++;
      out.push(lines[i]);
    }
    // copy lines up to the terminator, replaced by the file body
    i++;
    while (i < lines.length && lines[i] !== tag) i++;
    if (i >= lines.length) throw new Error(`unterminated heredoc ${tag} for @embed ${file}`);
    const body = readFileSync(join(dir, file), 'utf-8').replace(/\n$/, '').split('\n');
    out.push(...body);
  }
  return { result: out.join('\n'), embedded };
}

export function main(argv, confDir = DIR, deployPath = DEPLOY) {
  const check = argv.includes('--check');
  const before = readFileSync(deployPath, 'utf-8');
  const { result, embedded } = sync(before, confDir);

  const confs = readdirSync(confDir).filter((f) => f.endsWith('.conf'));
  const orphans = confs.filter((f) => !embedded.has(f));
  if (orphans.length) {
    console.error(`sync-units: ${orphans.join(', ')} has no @embed marker in deploy.sh`);
    return 1;
  }
  if (result === before) return 0;
  if (check) {
    console.error('sync-units: deploy.sh is stale — run node scripts/units/sync-units.js');
    return 1;
  }
  writeFileSync(deployPath, result);
  console.log('sync-units: deploy.sh regenerated');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
