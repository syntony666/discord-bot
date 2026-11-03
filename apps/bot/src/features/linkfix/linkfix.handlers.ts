import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { MessageFlags } from 'discord-api-types/v10';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { AutoFeatureType, createLogger } from '@discord-bot/shared';
import { linkfixCommand } from './linkfix.command';
import { extractLinks, processLink, resolveLocation } from './linkfix.pipeline';
import type { AutoApi } from '../auto/auto.api';

const log = createLogger('Linkfix');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface LinkfixDeps {
  discord: DiscordHelpers;
  api: { auto: AutoApi };
}

export function useLinkfixHandlers(deps: LinkfixDeps) {
  const { discord } = deps;
  const api = deps.api.auto;
  const h = useHandlers(linkfixCommand);

  h.handler('linkfix', async (ctx) => {
    const raw = ctx.options.url.trim();
    const input = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const result = await processLink(input, resolveLocation);
    if (result.kind === 'none') {
      return ctx.error('無需修復', '這個連結不需要修復，或不是有效的網址。');
    }
    await ctx.reply({ content: result.url });
    log.info({ guildId: ctx.guildId, kind: result.kind }, 'Link fixed by command');
  });

  h.event('messageCreate', async (msg) => {
    if (!msg.guild_id || msg.author.bot) return;
    const urls = extractLinks(msg.content);
    if (urls.length === 0) return;

    const cfg = await api.getFeature(msg.guild_id, AutoFeatureType.LINKFIX);
    if (!cfg?.enabled) return;

    const results = await Promise.all(urls.map((u) => processLink(u, resolveLocation)));
    const fixed = results
      .filter((r) => r.kind === 'fix' || r.kind === 'resolved')
      .map((r) => r.url);
    if (fixed.length === 0) return;

    // Suppress the broken previews first so a repost never doubles embeds.
    try {
      await discord.editMessage(msg.channel_id, msg.id, {
        flags: (msg.flags ?? 0) | MessageFlags.SuppressEmbeds,
      });
    } catch (error) {
      log.warn(
        { guildId: msg.guild_id, channelId: msg.channel_id, error: (error as Error).message },
        'Failed to suppress embeds, skipping repost'
      );
      return;
    }

    try {
      await discord.sendMessage(msg.channel_id, {
        content: `由 ${Formatters.userMention(msg.author.id)} 分享：\n${fixed.join('\n')}`,
      });
      log.info(
        { guildId: msg.guild_id, channelId: msg.channel_id, count: fixed.length },
        'Links fixed and reposted'
      );
    } catch (error) {
      log.warn(
        { guildId: msg.guild_id, channelId: msg.channel_id, error: (error as Error).message },
        'Failed to repost fixed links'
      );
    }
  });

  return h.collect();
}
