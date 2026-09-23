const SEPARATOR = ';;';

export const truncate = (s: string, maxLen: number) =>
  s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;

/**
 * Display form of a rule response: single responses truncate at maxLen,
 * `;;` candidates show as many as fit plus a total count.
 */
export const responsePreview = (response: string, maxLen: number) => {
  const parts = response.split(SEPARATOR).filter((p) => p.length > 0);
  if (parts.length <= 1) return truncate(response, maxLen);

  const suffix = ` (共 ${parts.length} 個候選)`;
  if (parts[0]!.length > maxLen) {
    return `${truncate(parts[0]!, maxLen)}${SEPARATOR}…${suffix}`;
  }

  const shown: string[] = [];
  let len = 0;
  for (const p of parts) {
    if (shown.length > 0 && len + p.length + SEPARATOR.length > maxLen) break;
    shown.push(p);
    len += p.length + SEPARATOR.length;
  }
  const base = shown.join(SEPARATOR);
  return shown.length < parts.length ? `${base}${SEPARATOR}…${suffix}` : `${base}${suffix}`;
};
