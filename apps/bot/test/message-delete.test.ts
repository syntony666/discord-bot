import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDeleteLogEmbed,
  createMessageCache,
} from '../src/features/notify/message-delete.utils.ts';
import type { CachedMessage } from '../src/features/notify/message-delete.utils.ts';

const entry = (over: Partial<CachedMessage> = {}): CachedMessage => ({
  authorId: '111',
  authorName: 'TestUser',
  avatar: null,
  isBot: false,
  content: 'hello',
  attachmentCount: 0,
  timestamp: '2026-10-30T10:00:00.000Z',
  ...over,
});

test('messageCache evicts oldest entry past capacity', () => {
  const cache = createMessageCache(2);
  cache.set('a', entry());
  cache.set('b', entry());
  cache.set('c', entry());
  assert.equal(cache.size, 2);
  assert.equal(cache.get('a'), undefined);
  assert.ok(cache.get('b'));
  assert.ok(cache.get('c'));
});

test('messageCache re-set refreshes position and delete removes', () => {
  const cache = createMessageCache(2);
  cache.set('a', entry());
  cache.set('b', entry());
  cache.set('a', entry()); // refresh a → b becomes oldest
  cache.set('c', entry());
  assert.equal(cache.get('b'), undefined);
  assert.ok(cache.get('a'));
  cache.delete('a');
  assert.equal(cache.get('a'), undefined);
});

test('buildDeleteLogEmbed renders fields and truncates long content', () => {
  const embed = buildDeleteLogEmbed(entry({ content: 'x'.repeat(1500) }), '999', 0xff0000);
  assert.equal(embed.title, '訊息被刪除');
  assert.equal(embed.description?.length, 1000 + 2 + '<#999>'.length);
  assert.equal(embed.fields, undefined);
  assert.ok(embed.description?.endsWith('<#999>'));
  assert.equal(embed.footer?.text, 'TestUser・111');
  assert.equal(embed.timestamp, '2026-10-30T10:00:00.000Z');
});

test('buildDeleteLogEmbed sets avatar footer icon when present', () => {
  const embed = buildDeleteLogEmbed(entry({ avatar: 'a_abc123' }), '999', 0xff0000);
  assert.equal(embed.footer?.icon_url, 'https://cdn.discordapp.com/avatars/111/a_abc123.gif');
  assert.equal(buildDeleteLogEmbed(entry(), '999', 0xff0000).footer?.icon_url, undefined);
});

test('buildDeleteLogEmbed handles attachment-only messages', () => {
  const embed = buildDeleteLogEmbed(entry({ content: '', attachmentCount: 3 }), '999', 0xff0000);
  assert.ok(embed.description?.startsWith('(無文字內容)'));
  const attach = embed.fields?.find((f) => f.name === '附件');
  assert.equal(attach?.value, '3 個');
});
