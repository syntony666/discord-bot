import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandsMatch } from '../src/internal/sync.ts';

const remoteCmd = (over = {}) => ({
  id: '1',
  application_id: 'app',
  version: '1',
  name: 'status',
  description: 'Status commands',
  type: 1,
  contexts: [0, 1, 2],
  integration_types: [0],
  nsfw: false,
  options: [
    {
      type: 1,
      name: 'bot',
      description: 'Bot info',
    },
  ],
  ...over,
});

const localCmd = (over = {}) => ({
  name: 'status',
  description: 'Status commands',
  type: 1,
  options: [{ type: 1, name: 'bot', description: 'Bot info' }],
  ...over,
});

test('matches when local defs equal remote commands', () => {
  assert.equal(commandsMatch([localCmd()], [remoteCmd()]), true);
});

test('local-omitted optional fields match Discord defaults', () => {
  // contexts/integration_types/nsfw absent locally → remote defaults [0,1,2]/[0]/false
  assert.equal(commandsMatch([localCmd()], [remoteCmd()]), true);
});

test('omitted required matches remote required:false', () => {
  const remote = remoteCmd({
    options: [{ type: 3, name: 'query', description: 'q', required: false }],
  });
  const local = localCmd({
    options: [{ type: 3, name: 'query', description: 'q' }],
  });
  assert.equal(commandsMatch([local], [remote]), true);
});

test('fails on extra remote command', () => {
  const extra = remoteCmd({ id: '2', name: 'extra' });
  assert.equal(commandsMatch([localCmd()], [remoteCmd(), extra]), false);
});

test('fails on missing remote command', () => {
  assert.equal(commandsMatch([localCmd()], []), false);
});

test('fails on description difference', () => {
  const remote = remoteCmd({ description: 'changed' });
  assert.equal(commandsMatch([localCmd()], [remote]), false);
});

test('fails on option difference', () => {
  const remote = remoteCmd({
    options: [{ type: 1, name: 'bot', description: 'different' }],
  });
  assert.equal(commandsMatch([localCmd()], [remote]), false);
});

test('fails when remote has non-default field local omits', () => {
  const remote = remoteCmd({ contexts: [0] });
  assert.equal(commandsMatch([localCmd()], [remote]), false);
});

test('explicit contexts match regardless of order', () => {
  const local = localCmd({ contexts: [2, 0] });
  const remote = remoteCmd({ contexts: [0, 2] });
  assert.equal(commandsMatch([local], [remote]), true);
});
