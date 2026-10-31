import { CDN, calculateUserDefaultAvatarIndex } from '@discord-bot/discord-client';
import type { APIUser } from 'discord-api-types/v10';

const cdn = new CDN();

/** Slash-command option inputs can't carry real newlines — `\n` sequences become line breaks. */
export function unescapeNewlines(input: string): string {
  return input.replace(/\\n/g, '\n');
}

/** Avatar CDN URL, falling back to the generated default avatar. */
export function avatarUrlOf(user: Pick<APIUser, 'id' | 'avatar'>): string {
  return user.avatar
    ? cdn.avatar(user.id, user.avatar)
    : cdn.defaultAvatar(calculateUserDefaultAvatarIndex(user.id));
}
