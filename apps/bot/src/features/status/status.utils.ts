import { CDN, calculateUserDefaultAvatarIndex } from '@discord-bot/discord-client';

const cdn = new CDN();

export const avatarUrl = (userId: string, avatarHash?: string | null): string =>
  avatarHash
    ? cdn.avatar(userId, avatarHash)
    : cdn.defaultAvatar(calculateUserDefaultAvatarIndex(userId));

export const guildIconUrl = (guildId: string, iconHash?: string | null): string | undefined =>
  iconHash ? cdn.icon(guildId, iconHash) : undefined;
