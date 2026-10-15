import { Formatters } from '@discord-bot/discord-client';

export interface ParsedEmoji {
  id: string | null;
  name: string;
  animated: boolean;
  formatted: string;
}

export function parseEmoji(input: string): ParsedEmoji {
  const trimmed = input.trim();

  // Custom emoji: <:name:id>, <a:name:id>, name:id, a:name:id
  const custom = trimmed
    .replace(/^</, '')
    .replace(/>$/, '')
    .match(/^(?:(a):)?(\w+):(\d+)$/);
  if (custom) {
    const [, a, name, id] = custom;
    return {
      id: id!,
      name: name!,
      animated: !!a,
      formatted: `${a ? 'a:' : ''}${name}:${id}`,
    };
  }

  // Legacy bare-id format
  if (/^\d+$/.test(trimmed)) {
    return {
      id: trimmed,
      name: 'emoji',
      animated: false,
      formatted: `emoji:${trimmed}`,
    };
  }

  // :shortcode: or unicode emoji — stored as-is
  const shortcode = trimmed.match(/^:(\w+):$/);
  const name = shortcode ? shortcode[1]! : trimmed;
  return { id: null, name, animated: false, formatted: name };
}

export function normalizeEmojiForStorage(input: string): string {
  const parsed = parseEmoji(input);
  return parsed.formatted;
}

export function normalizeEmojiFromReaction(emoji: {
  id?: string | null;
  name?: string | null;
  animated?: boolean | null;
}): string {
  if (emoji.id) {
    return `${emoji.animated ? 'a:' : ''}${emoji.name || 'emoji'}:${emoji.id}`;
  }
  return emoji.name || '';
}

export function formatEmojiForReaction(stored: string): string {
  return stored;
}

export function formatEmojiForDisplay(stored: string): string {
  const trimmed = stored.trim();
  const custom = trimmed
    .replace(/^</, '')
    .replace(/>$/, '')
    .match(/^(?:(a):)?(\w+):(\d+)$/);
  if (!custom) return trimmed;

  const [, a, name, id] = custom;
  return Formatters.formatEmoji({ id: id!, name: name!, animated: !!a });
}
