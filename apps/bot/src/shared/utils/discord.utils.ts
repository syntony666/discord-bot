export class DiscordUtils {
  static mention = {
    user: (userId: string | bigint): string => `<@${userId}>`,
    channel: (channelId: string | bigint): string => `<#${channelId}>`,
    role: (roleId: string | bigint): string => `<@&${roleId}>`,
  };

  static url = {
    message: (
      guildId: string | bigint,
      channelId: string | bigint,
      messageId: string | bigint
    ): string => `https://discord.com/channels/${guildId}/${channelId}/${messageId}`,

    channel: (guildId: string | bigint, channelId: string | bigint): string =>
      `https://discord.com/channels/${guildId}/${channelId}`,

    guild: (guildId: string | bigint): string => `https://discord.com/channels/${guildId}`,
  };

  static timestamp = {
    relative: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:R>`,
    short: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:f>`,
    long: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:F>`,
    date: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:D>`,
    time: (date: Date): string => `<t:${Math.floor(date.getTime() / 1000)}:t>`,
  };

  static emoji = {
    custom: (emojiId: string | bigint, name: string): string => `<:${name}:${emojiId}>`,
    unicode: (emoji: string): string => emoji,
    parse: (emoji: { id?: bigint; name?: string; animated?: boolean }): string => {
      if (emoji.id && emoji.name) {
        return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
      }
      return emoji.name || '';
    },
  };

  static embed = {
    basic: (data: { title?: string; description?: string; color?: number }) => ({
      type: 0 as const,
      title: data.title,
      description: data.description,
      color: data.color,
    }),
    error: (description: string) => ({
      type: 0 as const,
      title: '❌ 錯誤',
      description,
      color: 0xff0000,
    }),
    success: (description: string) => ({
      type: 0 as const,
      title: '✅ 成功',
      description,
      color: 0x00ff00,
    }),
    warning: (description: string) => ({
      type: 0 as const,
      title: '⚠️ 警告',
      description,
      color: 0xffff00,
    }),
  };

  static format = {
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
    number: (num: number): string => num.toLocaleString(),
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
