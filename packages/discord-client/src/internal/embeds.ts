import type { APIEmbed, APIInteraction, APIUser } from 'discord-api-types/v10';

export interface EmbedTheme {
  footerIconUrl: string;
  colors: {
    success: number;
    error: number;
    confirm: number;
    info: number;
  };
}

export const usernameOf = (i: APIInteraction): string =>
  i.user?.username ?? i.member?.user.username ?? 'unknown';

export const avatarUrlOf = (user: APIUser): string =>
  user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

export const withEmbedDefaults = (
  embed: APIEmbed,
  username: string,
  theme: EmbedTheme
): APIEmbed => ({
  ...embed,
  footer: embed.footer ?? {
    text: username,
    icon_url: theme.footerIconUrl,
  },
  timestamp: embed.timestamp ?? new Date().toISOString(),
});
