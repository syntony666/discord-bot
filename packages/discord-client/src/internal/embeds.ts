import type { APIEmbed, APIInteraction } from 'discord-api-types/v10';

export interface EmbedTheme {
  footerIconUrl?: string;
}

export const usernameOf = (i: APIInteraction): string =>
  i.user?.username ?? i.member?.user.username ?? 'unknown';

export const withEmbedDefaults = (
  embed: APIEmbed,
  username: string,
  theme?: EmbedTheme
): APIEmbed => ({
  ...embed,
  footer: embed.footer ?? {
    text: username,
    ...(theme?.footerIconUrl ? { icon_url: theme.footerIconUrl } : {}),
  },
  timestamp: embed.timestamp ?? new Date().toISOString(),
});
