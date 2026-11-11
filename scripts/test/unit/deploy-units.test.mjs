import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// deploy.sh embeds the systemd unit templates; they must stay byte-identical
// to deploy/systemd/*.conf (plan §9.7).

function extract(fn) {
  const def = execFileSync('sed', ['-n', `/^${fn}()/,/^}/p`, 'scripts/deploy.sh'], {
    encoding: 'utf-8',
  });
  assert.ok(def.length > 0, `${fn} not found in deploy.sh`);
  return execFileSync('bash', ['-c', `${def}\n${fn}`], { encoding: 'utf-8' });
}

test('embedded api unit matches deploy/systemd/discord-bot-api.conf', () => {
  const conf = readFileSync('deploy/systemd/discord-bot-api.conf', 'utf-8');
  assert.equal(extract('unit_body_api'), conf);
});

test('embedded bot unit matches deploy/systemd/discord-bot.conf', () => {
  const conf = readFileSync('deploy/systemd/discord-bot.conf', 'utf-8');
  assert.equal(extract('unit_body_bot'), conf);
});
