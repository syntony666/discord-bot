import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyUrl,
  extractLinks,
  processLink,
  sniffHtmlRedirect,
  stripTracking,
} from '../src/features/linkfix/linkfix.pipeline.ts';

test('extractLinks skips <> opt-out and || spoiler wrappings', () => {
  assert.deepEqual(extractLinks('<https://x.com/a/status/1>'), []);
  assert.deepEqual(extractLinks('||https://x.com/a/status/1||'), []);
  assert.deepEqual(extractLinks('看這個 https://x.com/a/status/1'), ['https://x.com/a/status/1']);
});

test('extractLinks trims trailing CJK and ASCII punctuation', () => {
  assert.deepEqual(extractLinks('連結：https://x.com/a/status/1。'), ['https://x.com/a/status/1']);
  assert.deepEqual(extractLinks('(https://x.com/a/status/1)'), ['https://x.com/a/status/1']);
});

test('extractLinks picks up bare host/path for known hosts', () => {
  assert.deepEqual(extractLinks('看這個 reurl.cc/Ab12 喔'), ['https://reurl.cc/Ab12']);
  assert.deepEqual(extractLinks('x.com/a/status/1'), ['https://x.com/a/status/1']);
  // Scheme-prefixed URLs are not double-counted by the bare pass.
  assert.deepEqual(extractLinks('https://reurl.cc/Ab12'), ['https://reurl.cc/Ab12']);
  // Unknown bare domains are ignored.
  assert.deepEqual(extractLinks('example.com/page'), []);
});

test('classifyUrl swaps all six fixer platforms', () => {
  const cases: [string, string][] = [
    ['https://x.com/a/status/123', 'https://vxtwitter.com/a/status/123'],
    ['https://twitter.com/a/status/123?s=20&t=abc', 'https://vxtwitter.com/a/status/123'],
    ['https://www.instagram.com/p/AbC_123/', 'https://vxinstagram.com/p/AbC_123/'],
    ['https://instagram.com/share/AbC_123', 'https://vxinstagram.com/share/AbC_123'],
    ['https://tiktok.com/@user/video/456', 'https://vxtiktok.com/@user/video/456'],
    ['https://pixiv.net/artworks/789', 'https://phixiv.net/artworks/789'],
    ['https://pixiv.net/en/artworks/789', 'https://phixiv.net/en/artworks/789'],
    ['https://threads.net/@u/post/xYz', 'https://vxthreads.com/@u/post/xYz'],
    ['https://www.threads.com/@u/post/xYz', 'https://vxthreads.com/@u/post/xYz'],
    ['https://facebook.com/reel/123', 'https://facebed.com/reel/123'],
    ['https://m.facebook.com/watch/?v=1', 'https://facebed.com/watch/?v=1'],
    [
      'https://www.facebook.com/story.php?story_fbid=123&id=456&mibextid=x',
      'https://facebed.com/story.php?story_fbid=123&id=456',
    ],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(classifyUrl(input), { kind: 'fix', url: expected });
  }
});

test('classifyUrl leaves non-post paths alone', () => {
  assert.equal(classifyUrl('https://x.com/elonmusk').kind, 'none');
  assert.equal(classifyUrl('https://pixiv.net').kind, 'none');
  assert.equal(classifyUrl('https://instagram.com/explore/').kind, 'none');
});

test('classifyUrl marks allowlisted shorteners', () => {
  for (const host of [
    't.co',
    'fb.watch',
    'vt.tiktok.com',
    'b23.tv',
    'xhslink.com',
    'reurl.cc',
    'lihi.cc',
    'bit.ly',
  ]) {
    assert.equal(classifyUrl(`https://${host}/abc`).kind, 'shorten', host);
  }
  assert.equal(classifyUrl('https://www.threads.com/share/Ab12C/').kind, 'shorten');
});

test('classifyUrl strips tracking params but keeps functional ones', () => {
  assert.deepEqual(classifyUrl('https://youtube.com/watch?v=abc&si=track'), {
    kind: 'strip',
    url: 'https://youtube.com/watch?v=abc',
  });
  assert.deepEqual(classifyUrl('https://youtu.be/abc?si=track'), {
    kind: 'strip',
    url: 'https://youtu.be/abc',
  });
  assert.deepEqual(classifyUrl('https://example.com/page?id=1&utm_source=fb'), {
    kind: 'strip',
    url: 'https://example.com/page?id=1',
  });
  assert.equal(classifyUrl('https://youtube.com/watch?v=abc').kind, 'none');
});

test('classifyUrl rejects non-URL and non-http input', () => {
  assert.equal(classifyUrl('not a url').kind, 'none');
  assert.equal(classifyUrl('ftp://files.example.com/x').kind, 'none');
});

test('stripTracking strips global and host-specific params', () => {
  assert.equal(
    stripTracking(new URL('https://www.bilibili.com/video/BV1xx?vd_source=a&spm_id_from=b&t=30')),
    'https://www.bilibili.com/video/BV1xx?t=30'
  );
});

test('processLink resolves a shortener into a fixed link', async () => {
  const result = await processLink(
    'https://vt.tiktok.com/abc/',
    async () => 'https://www.tiktok.com/@u/video/999'
  );
  assert.deepEqual(result, { kind: 'fix', url: 'https://vxtiktok.com/@u/video/999' });
});

test('processLink resolves a shortener into a stripped link', async () => {
  const result = await processLink(
    'https://reurl.cc/xyz',
    async () => 'https://example.com/a?utm_source=x&id=1'
  );
  assert.deepEqual(result, { kind: 'resolved', url: 'https://example.com/a?id=1' });
});

test('processLink resolves a shortener into a plain resolved link', async () => {
  const result = await processLink(
    'https://reurl.cc/xyz',
    async () => 'https://example.com/article'
  );
  assert.deepEqual(result, { kind: 'resolved', url: 'https://example.com/article' });
});

test('processLink resolves threads share links into fixed posts', async () => {
  const result = await processLink(
    'https://www.threads.com/share/Ab12C/',
    async () => 'https://www.threads.com/@u/post/DfDdw4dkuKH?xmt=track'
  );
  assert.deepEqual(result, { kind: 'fix', url: 'https://vxthreads.com/@u/post/DfDdw4dkuKH' });
});

test('sniffHtmlRedirect finds markup and JS redirect targets', () => {
  assert.equal(
    sniffHtmlRedirect(
      `<div data-redirect-url='https://x.com/a/status/1'></div>`,
      'https://reurl.cc/x'
    ),
    'https://x.com/a/status/1'
  );
  assert.equal(
    sniffHtmlRedirect(`<meta http-equiv="refresh" content="0;url=/target">`, 'https://reurl.cc/x'),
    'https://reurl.cc/target'
  );
  assert.equal(
    sniffHtmlRedirect(`window.location.href = "https://example.com/out"`, 'https://lihi.cc/x'),
    'https://example.com/out'
  );
  assert.equal(sniffHtmlRedirect('<p>no redirect</p>', 'https://lihi.cc/x'), null);
});

test('processLink returns none when resolution fails', async () => {
  const result = await processLink('https://bit.ly/abc', async () => null);
  assert.equal(result.kind, 'none');
});

test('processLink follows chained shorteners up to the hop cap', async () => {
  const seen: string[] = [];
  const result = await processLink('https://bit.ly/a', async (u) => {
    seen.push(u);
    return u.includes('is.gd') ? 'https://x.com/u/status/1' : 'https://is.gd/b';
  });
  assert.deepEqual(result, { kind: 'fix', url: 'https://vxtwitter.com/u/status/1' });
  assert.deepEqual(seen, ['https://bit.ly/a', 'https://is.gd/b']);
});
