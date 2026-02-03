/**
 * Discord formatting utilities
 * Provides helpers for mentions, URLs, and timestamps
 */

/**
 * Format user mention
 * @example userMention('123456789') // <@123456789>
 */
export function userMention(userId: string | bigint): string {
  return `<@${userId}>`;
}

/**
 * Format channel mention
 * @example channelMention('123456789') // <#123456789>
 */
export function channelMention(channelId: string | bigint): string {
  return `<#${channelId}>`;
}

/**
 * Format role mention
 * @example roleMention('123456789') // <@&123456789>
 */
export function roleMention(roleId: string | bigint): string {
  return `<@&${roleId}>`;
}

/**
 * Generate Discord message URL
 * @example getMessageUrl('guild123', 'channel456', 'message789')
 * // https://discord.com/channels/guild123/channel456/message789
 */
export function getMessageUrl(
  guildId: string | bigint,
  channelId: string | bigint,
  messageId: string | bigint
): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Format timestamp (relative time)
 * @example timestampRelative(new Date()) // <t:1234567890:R> -> "2 hours ago"
 */
export function timestampRelative(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

/**
 * Format timestamp (short date time)
 * @example timestampShort(new Date()) // <t:1234567890:f> -> "January 1, 2025 10:00 AM"
 */
export function timestampShort(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

/**
 * Format timestamp (long date time)
 * @example timestampLong(new Date()) // <t:1234567890:F> -> "Friday, January 1, 2025 10:00 AM"
 */
export function timestampLong(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

/**
 * Format timestamp (date only)
 * @example timestampDate(new Date()) // <t:1234567890:D> -> "01/01/2025"
 */
export function timestampDate(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:D>`;
}
