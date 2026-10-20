import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextDailyAt } from '../src/core/scheduler.ts';

const wallClock = (ts: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));

test('nextDailyAt returns a future timestamp', () => {
  assert.ok(nextDailyAt('08:00', 'Asia/Taipei') > Date.now());
  assert.ok(nextDailyAt('00:01', 'UTC') > Date.now());
});

test('nextDailyAt lands on the requested wall-clock time', () => {
  for (const [time, tz] of [
    ['08:00', 'Asia/Taipei'],
    ['23:59', 'Asia/Taipei'],
    ['14:30', 'America/New_York'],
    ['00:00', 'UTC'],
  ] as const) {
    assert.equal(wallClock(nextDailyAt(time, tz), tz), time, `${time} in ${tz}`);
  }
});

test('nextDailyAt skips today when the time already passed', () => {
  const at = nextDailyAt('00:00', 'UTC');
  // Tomorrow or later — today's 00:00 is always in the past.
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: '2-digit' }).format;
  assert.notEqual(day(new Date(at)), day(new Date()));
});
