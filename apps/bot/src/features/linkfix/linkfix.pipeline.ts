/**
 * Link pipeline: extract URLs → (optionally) expand shorteners → swap to an
 * embed-fixer domain or strip tracking params. Pure except `resolveLocation`.
 */

interface FixerRule {
  fixer: string;
  hosts: readonly string[];
  /** Tested against the URL pathname — only matching paths get swapped. */
  pattern: RegExp;
  /** Query params carried to the fixed URL (query-dependent routes like story.php). */
  keepParams?: readonly string[];
}

export const FIXER_RULES: readonly FixerRule[] = [
  {
    fixer: 'vxtwitter.com',
    hosts: ['twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'x.com', 'www.x.com'],
    pattern: /^\/[^/]+\/status\/\d+/,
  },
  {
    fixer: 'vxinstagram.com',
    hosts: ['instagram.com', 'www.instagram.com'],
    pattern: /^\/(p|reel|reels|tv|share|stories)\/[\w-]+/,
  },
  {
    fixer: 'vxtiktok.com',
    hosts: ['tiktok.com', 'www.tiktok.com'],
    pattern: /^\/@[^/]+\/(video|photo)\/\d+/,
  },
  {
    fixer: 'phixiv.net',
    hosts: ['pixiv.net', 'www.pixiv.net'],
    pattern: /^\/(en\/)?artworks\/\d+/,
  },
  {
    fixer: 'vxthreads.com',
    hosts: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'],
    pattern: /^\/@[^/]+\/post\/[\w-]+/,
  },
  {
    fixer: 'facebed.com',
    hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
    pattern: /^\/(reel|watch|posts|share|photo|video|permalink|story)/,
    keepParams: ['story_fbid', 'id', 'v', 'fbid', 'set'],
  },
];

/** Allowlisted shorteners — expanded by reading one Location hop, never followed. */
export const SHORTENER_HOSTS: ReadonlySet<string> = new Set([
  't.co',
  'fb.watch',
  'fb.me',
  'ig.me',
  'vt.tiktok.com',
  'vm.tiktok.com',
  'b23.tv',
  'xhslink.com',
  'bit.ly',
  'tinyurl.com',
  'is.gd',
  'reurl.cc',
  'lihi.cc',
  'lihi2.cc',
]);

/** Host+path pairs that redirect (not in SHORTENER_HOSTS because the host is a fixer host). */
const SHORTENER_PATTERNS: readonly { hosts: readonly string[]; pattern: RegExp }[] = [
  {
    hosts: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'],
    pattern: /^\/share\//,
  },
];

/** Unambiguous tracking params stripped on any host (`utm_*` matched by prefix). */
const GLOBAL_TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igsh',
  'igshid',
  'ig_rid',
  'mibextid',
  'm_entstream_source',
  '_t',
  '_r',
  'is_from_webapp',
  'is_copy_url',
  'sender_device',
  'sender_web_id',
  'web_id',
  'vd_source',
  'spm_id_from',
  'xhs_token',
  'xhsshare',
  'xsec_token',
  'xsec_source',
]);

/** Extra params that are tracking only on these hosts (generic names elsewhere). */
const HOST_TRACKING_PARAMS: Readonly<Record<string, readonly string[]>> = {
  'youtube.com': ['si', 'feature'],
  'www.youtube.com': ['si', 'feature'],
  'm.youtube.com': ['si', 'feature'],
  'youtu.be': ['si'],
  'spotify.com': ['si'],
  'open.spotify.com': ['si'],
  'bilibili.com': [
    'vd_source',
    'timestamp',
    'unique_k',
    'bbid',
    'share_source',
    'share_medium',
    'share_plat',
    'share_tag',
    'share_session_id',
    'ts',
  ],
  'www.bilibili.com': [
    'vd_source',
    'timestamp',
    'unique_k',
    'bbid',
    'share_source',
    'share_medium',
    'share_plat',
    'share_tag',
    'share_session_id',
    'ts',
  ],
  'xiaohongshu.com': [
    'xsec_token',
    'xsec_source',
    'xhsshare',
    'source',
    'shareId',
    'share_channel',
    'share_from_user_hidden',
  ],
  'www.xiaohongshu.com': [
    'xsec_token',
    'xsec_source',
    'xhsshare',
    'source',
    'shareId',
    'share_channel',
    'share_from_user_hidden',
  ],
  'twitter.com': ['s', 't', 'ref_src', 'ref_url'],
  'x.com': ['s', 't', 'ref_src', 'ref_url'],
};

export type LinkAction =
  | { kind: 'fix'; url: string }
  | { kind: 'resolved'; url: string }
  | { kind: 'shorten'; url: string }
  | { kind: 'strip'; url: string }
  | { kind: 'none' };

const URL_RE = /https?:\/\/[^\s<>"'「」（）\[\]|]+/g;
const BARE_HOSTS_RE = new RegExp(
  `\\b(?:${[...FIXER_RULES.flatMap((r) => r.hosts), ...SHORTENER_HOSTS]
    .map((h) => h.replace(/\./g, '\\.'))
    .join('|')})/[^\\s<>"'「」（）\\[\\]|]+`,
  'g'
);
const TRAILING_JUNK = /[.,;:!?)。，；：！？》」』)]+$/;

/** Raw URLs in a message — full-scheme plus bare `host/path` for known hosts.
 *  Skips `<>` (opt-out) and `||` (spoiler) wrappings. */
export function extractLinks(content: string): string[] {
  const out: string[] = [];
  const skipped = (idx: number, end: number) =>
    (content[idx - 1] === '<' && content[end] === '>') ||
    (content[idx - 1] === '|' && content[end] === '|');
  for (const m of content.matchAll(URL_RE)) {
    const url = m[0].replace(TRAILING_JUNK, '');
    if (url && !skipped(m.index!, m.index! + m[0].length)) out.push(url);
  }
  for (const m of content.matchAll(BARE_HOSTS_RE)) {
    // Bare matches inside a scheme:// match are already captured above.
    if (content.slice(m.index! - 3, m.index!) === '://') continue;
    const url = m[0].replace(TRAILING_JUNK, '');
    if (url && !skipped(m.index!, m.index! + m[0].length)) out.push(`https://${url}`);
  }
  return [...new Set(out)];
}

/** Strips known tracking params; returns the normalized URL string. */
export function stripTracking(url: URL): string {
  const extras = HOST_TRACKING_PARAMS[url.hostname.toLowerCase()] ?? [];
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || GLOBAL_TRACKING_PARAMS.has(key) || extras.includes(key)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

/** Pure classification — `shorten` needs a resolution pass to finish. */
export function classifyUrl(raw: string): LinkAction {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { kind: 'none' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { kind: 'none' };
  const host = u.hostname.toLowerCase();
  const rule = FIXER_RULES.find((r) => r.hosts.includes(host) && r.pattern.test(u.pathname));
  if (rule) {
    const kept = new URLSearchParams();
    for (const p of rule.keepParams ?? []) {
      const v = u.searchParams.get(p);
      if (v !== null) kept.set(p, v);
    }
    return {
      kind: 'fix',
      url: `https://${rule.fixer}${u.pathname}${kept.size ? `?${kept}` : ''}`,
    };
  }
  const isShortener =
    SHORTENER_HOSTS.has(host) ||
    SHORTENER_PATTERNS.some((s) => s.hosts.includes(host) && s.pattern.test(u.pathname));
  if (isShortener) return { kind: 'shorten', url: raw };
  const before = u.toString();
  const stripped = stripTracking(u);
  if (stripped !== before) return { kind: 'strip', url: stripped };
  return { kind: 'none' };
}

const MAX_REDIRECT_HOPS = 2;

/** Full pipeline for one URL. `resolve` fetches a shortener's Location header. */
export async function processLink(
  raw: string,
  resolve: (url: string) => Promise<string | null>
): Promise<LinkAction> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const action = classifyUrl(current);
    if (action.kind === 'shorten') {
      if (hop === MAX_REDIRECT_HOPS) return { kind: 'none' };
      const next = await resolve(current);
      if (!next) return { kind: 'none' };
      current = next;
      continue;
    }
    // A shortener that resolved: `fix` keeps its kind, anything else is an
    // expanded link worth reposting (the shortener itself can't embed).
    if (hop > 0) {
      if (action.kind === 'fix') return action;
      return { kind: 'resolved', url: action.kind === 'strip' ? action.url : current };
    }
    return action;
  }
  return { kind: 'none' };
}

/** Production resolver: one manual redirect hop per call, destination never fetched. */
export async function resolveLocation(url: string): Promise<string | null> {
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });
      const location = res.headers.get('location');
      if (location) return new URL(location, url).toString();
      if (res.status < 300 || res.status >= 400) return null;
    } catch {
      return null;
    }
  }
  return null;
}
