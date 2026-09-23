import type { APIEmbed, APIInteraction } from 'discord-api-types/v10';

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
