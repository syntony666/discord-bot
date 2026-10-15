import { splitKeywordResponse } from '@discord-bot/shared';

/** Picks one candidate uniformly from a `;;`-separated response string. */
export function pickResponse(response: string): string {
  const parts = splitKeywordResponse(response);
  if (parts.length === 0) return response;
  return parts[Math.floor(Math.random() * parts.length)]!;
}
