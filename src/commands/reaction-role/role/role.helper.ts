/**
 * Emoji formatting utilities for reaction roles.
 *
 * These functions handle conversion between:
 * - Storage format (e.g., "😀" or "name:id")
 * - Display format (e.g., "😀" or "<:name:id>")
 * - Reaction format (e.g., "😀" or "name:id")
 */

/**
 * Normalize emoji input for storage.
 * Converts "<:name:id>" to "name:id", keeps unicode as-is.
 *
 * @example
 * normalizeEmojiForStorage("<:smile:123>") // "smile:123"
 * normalizeEmojiForStorage("😀") // "😀"
 */
export function normalizeEmojiForStorage(emoji: string): string {
  const customMatch = emoji.match(/<a?:(\w+):(\d+)>/);
  if (customMatch) {
    return `${customMatch[1]}:${customMatch[2]}`;
  }
  return emoji;
}

/**
 * Format emoji for display in embeds/messages.
 * Converts "name:id" to "<:name:id>", keeps unicode as-is.
 *
 * @example
 * formatEmojiForDisplay("smile:123") // "<:smile:123>"
 * formatEmojiForDisplay("😀") // "😀"
 */
export function formatEmojiForDisplay(emoji: string): string {
  if (emoji.includes(':') && !emoji.startsWith('<')) {
    return `<:${emoji}>`;
  }
  return emoji;
}

/**
 * Format emoji for adding reactions to messages.
 * Keeps both "name:id" and unicode formats as-is.
 *
 * @example
 * formatEmojiForReaction("smile:123") // "smile:123"
 * formatEmojiForReaction("😀") // "😀"
 */
export function formatEmojiForReaction(emoji: string): string {
  return emoji;
}
