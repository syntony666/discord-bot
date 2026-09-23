import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickResponse } from '../src/modules/keyword.response.ts';

test('returns original string when no separator', () => {
  assert.equal(pickResponse('hello'), 'hello');
});

test('picks one of the candidates', () => {
  const parts = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) {
    assert.ok(parts.includes(pickResponse(parts.join(';;'))));
  }
});

test('all candidates can be picked over many runs', () => {
  const parts = ['x', 'y', 'z'];
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) seen.add(pickResponse(parts.join(';;')));
  assert.equal(seen.size, parts.length);
});

test('empty segments are filtered out', () => {
  for (let i = 0; i < 50; i++) {
    assert.ok(['a', 'b'].includes(pickResponse('a;;;;b;;')));
  }
});

test('falls back to original when every segment is empty', () => {
  assert.equal(pickResponse(';;'), ';;');
});
