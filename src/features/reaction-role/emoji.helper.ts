export interface ParsedEmoji {
  id: string | null;
  name: string;
  animated: boolean;
  formatted: string;
}

/**
 * Parse emoji string into structured format.
 * Handles multiple input formats:
 * - Custom emoji: <:name:id> or <a:name:id>
 * - Custom emoji shortcode: :name:
 * - Already formatted: name:id
 * - Unicode emoji: 🥛
 */
export function parseEmoji(input: string): ParsedEmoji {
  const trimmed = input.trim();

  // Format 1: Full custom emoji <:name:id> or <a:name:id>
  const fullCustomMatch = trimmed.match(/<(a)?:(\w+):(\d+)>/);
  if (fullCustomMatch) {
    const animated = !!fullCustomMatch[1];
    const name = fullCustomMatch[2];
    const id = fullCustomMatch[3];

    return {
      id: id as string,
      name: name as string,
      animated,
      formatted: `${name}:${id}`,
    };
  }

  // Format 2: Already formatted name:id
  const formattedMatch = trimmed.match(/^(\w+):(\d+)$/);
  if (formattedMatch) {
    const name = formattedMatch[1];
    const id = formattedMatch[2];

    return {
      id: id as string,
      name: name as string,
      animated: false,
      formatted: trimmed,
    };
  }

  // Format 3: Just ID (legacy format, needs migration)
  if (/^\d+$/.test(trimmed)) {
    return {
      id: trimmed,
      name: 'emoji',
      animated: false,
      formatted: `emoji:${trimmed}`, // Best effort formatting
    };
  }

  // Format 4: Shortcode :name: (can't be fully resolved without emoji ID)
  const shortcodeMatch = trimmed.match(/^:(\w+):$/);
  if (shortcodeMatch) {
    const name = shortcodeMatch[1];
    // We can't know the ID from just the name, so treat as Unicode
    return {
      id: null,
      name: name as string,
      animated: false,
      formatted: name as string, // Use name as-is
    };
  }

  // Format 5: Unicode emoji
  return {
    id: null,
    name: trimmed,
    animated: false,
    formatted: trimmed,
  };
}

/**
 * Normalize emoji for database storage and Discord reactions.
 */
export function normalizeEmojiForStorage(input: string): string {
  const parsed = parseEmoji(input);
  return parsed.formatted;
}

/**
 * Normalize emoji from Discord reaction event.
 */
export function normalizeEmojiFromReaction(emoji: { id?: bigint; name?: string }): string {
  if (emoji.id) {
    return `${emoji.name || 'emoji'}:${emoji.id.toString()}`;
  }
  return emoji.name || '';
}

/**
 * Format emoji for adding reaction to message.
 */
export function formatEmojiForReaction(stored: string): string {
  return stored;
}

/**
 * Format emoji for display in embeds.
 */
export function formatEmojiForDisplay(stored: string): string {
  // Check if it's custom emoji format (name:id)
  const customMatch = stored.match(/^(\w+):(\d+)$/);
  if (customMatch) {
    const name = customMatch[1];
    const id = customMatch[2];
    return `<:${name}:${id}>`;
  }

  // Unicode emoji or other format
  return stored;
}
