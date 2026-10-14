import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '@discord-bot/shared';
import { assertWithinLimit } from '../src/modules/tier-limits.ts';

test('passes when under the limit', () => {
  assert.doesNotThrow(() => assertWithinLimit(3, 2, '實況監控'));
});

test('throws 403 LIMIT_EXCEEDED at the limit', () => {
  try {
    assertWithinLimit(3, 3, '實況監控');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 403);
    assert.equal(e.code, 'LIMIT_EXCEEDED');
    assert.match(e.message, /3/);
  }
});

test('throws when already over the limit', () => {
  assert.throws(() => assertWithinLimit(3, 5, '實況監控'), ApiError);
});

test('negative max means unlimited', () => {
  assert.doesNotThrow(() => assertWithinLimit(-1, 9999, '實況監控'));
});
