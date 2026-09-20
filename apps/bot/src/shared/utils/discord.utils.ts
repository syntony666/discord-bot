import { Formatters } from '@discord-bot/discord-client';

const { TimestampStyles } = Formatters;

export const userMention = (userId: string | bigint): string =>
  Formatters.userMention(String(userId));

export const channelMention = (channelId: string | bigint): string =>
  Formatters.channelMention(String(channelId));

export const roleMention = (roleId: string | bigint): string =>
  Formatters.roleMention(String(roleId));

export const getMessageUrl = (
  guildId: string | bigint,
  channelId: string | bigint,
  messageId: string | bigint
): string => `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

export const avatarUrl = (
  userId: string | bigint,
  avatarHash?: string | null,
  discriminator = '0'
): string =>
  avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discriminator) % 5}.png`;

export const guildIconUrl = (guildId: string | bigint, iconHash?: string | null): string | undefined =>
  iconHash ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png` : undefined;

export const timestampRelative = (date: Date): string =>
  Formatters.time(date, TimestampStyles.RelativeTime);

export const timestampShort = (date: Date): string =>
  Formatters.time(date, TimestampStyles.LongDateShortTime);

export const timestampLong = (date: Date): string =>
  Formatters.time(date, TimestampStyles.FullDateShortTime);

export const timestampDate = (date: Date): string =>
  Formatters.time(date, TimestampStyles.LongDate);
