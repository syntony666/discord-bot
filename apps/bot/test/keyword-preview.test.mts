import assert from 'node:assert/strict';
import { test } from 'node:test';
import { responsePreview, truncate } from '../src/features/keyword/keyword.preview.ts';

test('truncate cuts overlong strings', () => {
  assert.equal(truncate('short', 10), 'short');
  assert.equal(truncate('a'.repeat(200), 10), `${'a'.repeat(10)}…`);
});

test('single response passes through within maxLen', () => {
  assert.equal(responsePreview('hello', 150), 'hello');
});

test('single response truncates at maxLen', () => {
  const long = 'x'.repeat(200);
  assert.equal(responsePreview(long, 150), `${'x'.repeat(150)}…`);
});

test('multi candidates show all when they fit', () => {
  assert.equal(responsePreview('空;;空;;子彈', 150), '空;;空;;子彈 (共 3 個候選)');
});

test('multi candidates truncate with count suffix', () => {
  const resp = Array.from({ length: 20 }, (_, i) => `item${i}`).join(';;');
  const out = responsePreview(resp, 30);
  assert.ok(out.endsWith(';;… (共 20 個候選)'));
  assert.ok(out.startsWith('item0;;item1'));
});

test('oversized first candidate truncates alone', () => {
  const resp = `${'a'.repeat(200)};;b`;
  const out = responsePreview(resp, 50);
  assert.equal(out, `${'a'.repeat(50)}…;;… (共 2 個候選)`);
});
