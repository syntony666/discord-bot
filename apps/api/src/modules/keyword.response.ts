const SEPARATOR = ';;';

/** Picks one candidate uniformly from a `;;`-separated response string. */
export function pickResponse(response: string): string {
  const parts = response.split(SEPARATOR).filter((p) => p.length > 0);
  if (parts.length === 0) return response;
  return parts[Math.floor(Math.random() * parts.length)]!;
}
