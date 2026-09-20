import { Formatters } from '@discord-bot/discord-client';

const { TimestampStyles } = Formatters;

export class DiscordUtils {
  static mention = {
    user: (userId: string | bigint): string => Formatters.userMention(String(userId)),
    channel: (channelId: string | bigint): string => Formatters.channelMention(String(channelId)),
    role: (roleId: string | bigint): string => Formatters.roleMention(String(roleId)),
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

    avatar: (userId: string | bigint, avatarHash?: string | null, discriminator = '0'): string =>
      avatarHash
        ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(discriminator) % 5}.png`,

    guildIcon: (guildId: string | bigint, iconHash?: string | null): string | undefined =>
      iconHash ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png` : undefined,
  };

  static timestamp = {
    relative: (date: Date): string => Formatters.time(date, TimestampStyles.RelativeTime),
    short: (date: Date): string => Formatters.time(date, TimestampStyles.ShortDateTime),
    long: (date: Date): string => Formatters.time(date, TimestampStyles.LongDateTime),
    date: (date: Date): string => Formatters.time(date, TimestampStyles.LongDate),
    time: (date: Date): string => Formatters.time(date, TimestampStyles.ShortTime),
  };

  static emoji = {
    custom: (emojiId: string | bigint, name: string): string => `<:${name}:${emojiId}>`,
    unicode: (emoji: string): string => emoji,
    parse: (emoji: { id?: bigint; name?: string; animated?: boolean }): string => {
      if (emoji.id && emoji.name) {
        return Formatters.formatEmoji({
          id: String(emoji.id),
          name: emoji.name,
          animated: emoji.animated,
        });
      }
      return emoji.name || '';
    },
  };

  static embed = {
    basic: (data: { title?: string; description?: string; color?: number }) => ({
      title: data.title,
      description: data.description,
      color: data.color,
    }),
    error: (description: string) => ({
      title: '❌ 錯誤',
      description,
      color: 0xff0000,
    }),
    success: (description: string) => ({
      title: '✅ 成功',
      description,
      color: 0x00ff00,
    }),
    warning: (description: string) => ({
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
export const avatarUrl = DiscordUtils.url.avatar;
export const guildIconUrl = DiscordUtils.url.guildIcon;
export const timestampRelative = DiscordUtils.timestamp.relative;
export const timestampShort = DiscordUtils.timestamp.short;
export const timestampLong = DiscordUtils.timestamp.long;
export const timestampDate = DiscordUtils.timestamp.date;
