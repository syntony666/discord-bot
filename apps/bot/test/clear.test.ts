import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { APIMessage } from 'discord-api-types/v10';
import { partitionClearable, withinMinutes } from '../src/features/clear/clear.utils.ts';

const msg = (overrides: Partial<APIMessage> = {}): APIMessage =>
  ({
    id: '1',
    timestamp: '2026-11-03T10:00:00.000Z',
    pinned: false,
    ...overrides,
  }) as APIMessage;

test('partitionClearable separates pinned messages from clearable ones', () => {
  const { clearable, pinned } = partitionClearable([
    msg({ id: '1' }),
    msg({ id: '2', pinned: true }),
    msg({ id: '3' }),
  ]);
  assert.deepEqual(
    clearable.map((m) => m.id),
    ['1', '3']
  );
  assert.equal(pinned, 1);
});

test('withinMinutes accepts messages inside the window and rejects older ones', () => {
  const now = Date.parse('2026-11-03T10:30:00.000Z');
  assert.equal(withinMinutes(msg(), 60, now), true);
  assert.equal(withinMinutes(msg(), 15, now), false);
});
