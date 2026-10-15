import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize } from '../src/serialize.ts';

test('serialize preserves Error fields instead of {}', () => {
  const out = serialize({ error: new Error('boom') }) as Record<string, Record<string, unknown>>;
  assert.equal(out.error.name, 'Error');
  assert.equal(out.error.message, 'boom');
  assert.match(out.error.stack as string, /boom/);
});

test('serialize unwraps Error cause chains', () => {
  const err = new Error('outer', { cause: new Error('inner') });
  const out = serialize({ err }) as Record<string, Record<string, Record<string, unknown>>>;
  assert.equal(out.err.cause.name, 'Error');
  assert.equal(out.err.cause.message, 'inner');
});

test('serialize marks true cycles but keeps shared refs', () => {
  const shared = { v: 1 };
  const cyclic: Record<string, unknown> = { shared, shared2: shared };
  cyclic.self = cyclic;
  const out = serialize(cyclic) as Record<string, unknown>;
  assert.deepEqual(out.shared, { v: 1 });
  assert.deepEqual(out.shared2, { v: 1 });
  assert.equal(out.self, '[Circular]');
});

test('serialize handles bigint, Map, Set, Date', () => {
  const date = new Date('2026-01-01');
  const out = serialize({
    big: 10n,
    map: new Map([['k', 1]]),
    set: new Set([1, 2]),
    date,
  }) as Record<string, unknown>;
  assert.equal(out.big, '10');
  assert.deepEqual(out.map, { k: 1 });
  assert.deepEqual(out.set, [1, 2]);
  assert.equal(out.date, date);
});
