import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiceExpr, parsePickOptions, rollDice } from '../src/features/random/random.utils.ts';

test('parsePickOptions splits on all separator styles', () => {
  assert.deepEqual(parsePickOptions('a,b，c;d、e；f'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('parsePickOptions trims and drops empty items', () => {
  assert.deepEqual(parsePickOptions('  a ,,  b， '), ['a', 'b']);
});

test('parseDiceExpr accepts NdM, bare dM, and uppercase', () => {
  assert.deepEqual(parseDiceExpr('1d6'), { count: 1, sides: 6 });
  assert.deepEqual(parseDiceExpr('d6'), { count: 1, sides: 6 });
  assert.deepEqual(parseDiceExpr('4D20'), { count: 4, sides: 20 });
  assert.deepEqual(parseDiceExpr(' 2d8 '), { count: 2, sides: 8 });
});

test('parseDiceExpr accepts all modifier types', () => {
  for (const type of ['kh', 'dh', 'kl', 'dl'] as const) {
    assert.deepEqual(parseDiceExpr(`4d6${type}3`), {
      count: 4,
      sides: 6,
      modifier: { type, n: 3 },
    });
  }
});

test('parseDiceExpr rejects malformed expressions', () => {
  for (const bad of ['abc', '4x6', '4d6kh', '4d6k3', '']) {
    assert.equal(parseDiceExpr(bad), null, bad);
  }
});

test('parseDiceExpr rejects out-of-range counts, sides, and modifier n', () => {
  for (const bad of ['0d6', '101d6', '4d1', '4d1001', '4d6kh4', '4d6dh9', '4d6kh0']) {
    assert.equal(parseDiceExpr(bad), null, bad);
  }
});

test('rollDice without modifier keeps everything and sums all rolls', () => {
  const seq = [4, 2, 5];
  let i = 0;
  const { rolls, kept, total } = rollDice({ count: 3, sides: 6 }, () => seq[i++]);
  assert.deepEqual(rolls, [4, 2, 5]);
  assert.deepEqual(kept, [true, true, true]);
  assert.equal(total, 11);
});

test('rollDice dh drops the highest rolls', () => {
  const seq = [6, 5, 1, 3];
  let i = 0;
  const { kept, total } = rollDice(
    { count: 4, sides: 6, modifier: { type: 'dh', n: 1 } },
    () => seq[i++]
  );
  assert.deepEqual(kept, [false, true, true, true]);
  assert.equal(total, 9);
});

test('rollDice dl drops the lowest rolls', () => {
  const seq = [6, 5, 1, 3];
  let i = 0;
  const { kept, total } = rollDice(
    { count: 4, sides: 6, modifier: { type: 'dl', n: 1 } },
    () => seq[i++]
  );
  assert.deepEqual(kept, [true, true, false, true]);
  assert.equal(total, 14);
});

test('rollDice kh keeps only the highest rolls', () => {
  const seq = [6, 5, 1, 3];
  let i = 0;
  const { kept, total } = rollDice(
    { count: 4, sides: 6, modifier: { type: 'kh', n: 3 } },
    () => seq[i++]
  );
  assert.deepEqual(kept, [true, true, false, true]);
  assert.equal(total, 14);
});

test('rollDice kl keeps only the lowest rolls', () => {
  const seq = [6, 5, 1, 3];
  let i = 0;
  const { kept, total } = rollDice(
    { count: 4, sides: 6, modifier: { type: 'kl', n: 2 } },
    () => seq[i++]
  );
  assert.deepEqual(kept, [false, false, true, true]);
  assert.equal(total, 4);
});
