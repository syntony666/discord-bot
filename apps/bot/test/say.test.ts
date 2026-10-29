import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unescapeNewlines } from '../src/features/say/say.utils.ts';

test('unescapeNewlines converts \\n sequences to real newlines', () => {
  assert.equal(unescapeNewlines('a\\nb'), 'a\nb');
  assert.equal(unescapeNewlines('line1\\nline2\\nline3'), 'line1\nline2\nline3');
});

test('unescapeNewlines leaves plain text untouched', () => {
  assert.equal(unescapeNewlines('hello world'), 'hello world');
});
