import type { APIMessage } from 'discord-api-types/v10';

/** Pinned messages survive a purge — they tend to be announcements. */
export function partitionClearable(messages: APIMessage[]): {
  clearable: APIMessage[];
  pinned: number;
} {
  const clearable: APIMessage[] = [];
  let pinned = 0;
  for (const m of messages) {
    if (m.pinned) pinned++;
    else clearable.push(m);
  }
  return { clearable, pinned };
}

export function withinMinutes(message: APIMessage, minutes: number, now: number): boolean {
  return Date.parse(message.timestamp) >= now - minutes * 60_000;
}
