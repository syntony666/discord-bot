import type { APIEmbed, APIInteraction } from 'discord-api-types/v10';

export interface UiConfig {
  footerIconUrl?: string;
}

export const usernameOf = (i: APIInteraction): string =>
  i.user?.username ?? i.member?.user.username ?? 'unknown';

export const withEmbedDefaults = (
  embed: APIEmbed,
  username: string,
  ui?: UiConfig
): APIEmbed => ({
  ...embed,
  footer: embed.footer ?? {
    text: username,
    ...(ui?.footerIconUrl ? { icon_url: ui.footerIconUrl } : {}),
  },
  timestamp: embed.timestamp ?? new Date().toISOString(),
});
