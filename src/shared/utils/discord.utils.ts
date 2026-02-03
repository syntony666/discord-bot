/**
 * Discord Utilities Facade
 * Provides organized access to Discord formatting utilities
 */

/**
 * Main DiscordUtils facade that groups related functionality
 */
export class DiscordUtils {
  /**
   * Mention formatting utilities
   */
  static mention = {
    /**
     * Format user mention
     * @example DiscordUtils.mention.user('123456789') // <@123456789>
     */
    user: (userId: string | bigint): string => `<@${userId}>`,

    /**
     * Format channel mention
     * @example DiscordUtils.mention.channel('123456789') // <#123456789>
     */
    channel: (channelId: string | bigint): string => `<#${channelId}>`,

    /**
     * Format role mention
     * @example DiscordUtils.mention.role('123456789') // <@&123456789>
     */
    role: (roleId: string | bigint): string => `<@&${roleId}>`,
  };

  /**
   * URL generation utilities
   */
  static url = {
    /**
     * Generate Discord message URL
     * @example DiscordUtils.url.message('guild123', 'channel456', 'message789')
     * // https://discord.com/channels/guild123/channel456/message789
     */
    message: (
      guildId: string | bigint,
      channelId: string | bigint,
      messageId: string | bigint
    ): string => `https://discord.com/channels/${guildId}/${channelId}/${messageId}`,

    /**
     * Generate Discord channel URL
     * @example DiscordUtils.url.channel('guild123', 'channel456')
     * // https://discord.com/channels/guild123/channel456
     */
    channel: (guildId: string | bigint, channelId: string | bigint): string =>
      `https://discord.com/channels/${guildId}/${channelId}`,

    /**
     * Generate Discord guild URL
     * @example DiscordUtils.url.guild('guild123')
     * // https://discord.com/channels/guild123
     */
    guild: (guildId: string | bigint): string => `https://discord.com/channels/${guildId}`,
  };

  /**
   * Timestamp formatting utilities
   */
  static timestamp = {
    /**
     * Format timestamp (relative time)
     * @example DiscordUtils.timestamp.relative(new Date()) // <t:1234567890:R> -> "2 hours ago"
     */
    relative: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:R>`,

    /**
     * Format timestamp (short date time)
     * @example DiscordUtils.timestamp.short(new Date()) // <t:1234567890:f> -> "January 1, 2025 10:00 AM"
     */
    short: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:f>`,

    /**
     * Format timestamp (long date time)
     * @example DiscordUtils.timestamp.long(new Date()) // <t:1234567890:F> -> "Friday, January 1, 2025 10:00 AM"
     */
    long: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:F>`,

    /**
     * Format timestamp (date only)
     * @example DiscordUtils.timestamp.date(new Date()) // <t:1234567890:D> -> "01/01/2025"
     */
    date: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:D>`,

    /**
     * Format timestamp (time only)
     * @example DiscordUtils.timestamp.time(new Date()) // <t:1234567890:t> -> "10:00 AM"
     */
    time: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:t>`,
  };

  /**
   * Emoji formatting utilities
   */
  static emoji = {
    /**
     * Format custom emoji
     * @example DiscordUtils.emoji.custom('123456789', 'name') // <:name:123456789>
     */
    custom: (emojiId: string | bigint, name: string): string => `<:${name}:${emojiId}>`,

    /**
     * Format unicode emoji
     * @example DiscordUtils.emoji.unicode('😀') // 😀
     */
    unicode: (emoji: string): string => emoji,

    /**
     * Parse emoji from reaction object
     * @example DiscordUtils.emoji.parse({ id: '123456789', name: 'custom' }) // <:custom:123456789>
     */
    parse: (emoji: { id?: bigint; name?: string; animated?: boolean }): string => {
      if (emoji.id && emoji.name) {
        return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
      }
      return emoji.name || '';
    },
  };

  /**
   * Embed formatting utilities
   */
  static embed = {
    /**
     * Create basic embed structure
     * @example DiscordUtils.embed.basic({ title: 'Title', description: 'Description' })
     */
    basic: (data: { title?: string; description?: string; color?: number }) => ({
      type: 0 as const,
      title: data.title,
      description: data.description,
      color: data.color,
    }),

    /**
     * Create error embed
     * @example DiscordUtils.embed.error('Something went wrong')
     */
    error: (description: string) => ({
      type: 0 as const,
      title: '❌ 錯誤',
      description,
      color: 0xff0000,
    }),

    /**
     * Create success embed
     * @example DiscordUtils.embed.success('Operation completed')
     */
    success: (description: string) => ({
      type: 0 as const,
      title: '✅ 成功',
      description,
      color: 0x00ff00,
    }),

    /**
     * Create warning embed
     * @example DiscordUtils.embed.warning('Please be careful')
     */
    warning: (description: string) => ({
      type: 0 as const,
      title: '⚠️ 警告',
      description,
      color: 0xffff00,
    }),
  };

  /**
   * Formatting utilities
   */
  static format = {
    /**
     * Format bytes to human readable size
     * @example DiscordUtils.format.bytes(1024) // "1.00 KB"
     */
    bytes: (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${size.toFixed(2)} ${units[unitIndex]}`;
    },

    /**
     * Format number with commas
     * @example DiscordUtils.format.number(1234567) // "1,234,567"
     */
    number: (num: number): string => num.toLocaleString(),

    /**
     * Format duration in ms to human readable time
     * @example DiscordUtils.format.duration(3661000) // "1 hour 1 minute 1 second"
     */
    duration: (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      const parts = [];
      if (days > 0) parts.push(`${days}天`);
      if (hours % 24 > 0) parts.push(`${hours % 24}小時`);
      if (minutes % 60 > 0) parts.push(`${minutes % 60}分鐘`);
      if (seconds % 60 > 0) parts.push(`${seconds % 60}秒`);

      return parts.join(' ') || '0秒';
    },
  };
}

// Legacy function exports for backward compatibility
export const userMention = DiscordUtils.mention.user;
export const channelMention = DiscordUtils.mention.channel;
export const roleMention = DiscordUtils.mention.role;
export const getMessageUrl = DiscordUtils.url.message;
export const timestampRelative = DiscordUtils.timestamp.relative;
export const timestampShort = DiscordUtils.timestamp.short;
export const timestampLong = DiscordUtils.timestamp.long;
export const timestampDate = DiscordUtils.timestamp.date;
