import { useHandlers } from '@discord-bot/discord-client';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import type { GuildApi } from '@features/guild/guild.api';
import { botCommand } from './bot.command';

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface BotDeps {
  discord: DiscordHelpers;
  api: { guild: GuildApi };
}

export function useBotHandlers(deps: BotDeps) {
  const { discord } = deps;
  const api = deps.api.guild;
  const h = useHandlers(botCommand);

  h.handler('guild.list', async (ctx) => {
    const [guilds, records] = await Promise.all([discord.getBotGuilds(), api.listGuilds()]);
    const tiers = new Map(records.map((g) => [g.id, g.tier]));
    const items = guilds.map((g) => {
      const tier = tiers.get(g.id);
      const suffix = tier === undefined ? ' · ⚠️ 無記錄' : tier === 'NORMAL' ? '' : ` · ${tier}`;
      return `**${g.name}** · ${g.id} · ${g.approximate_member_count ?? '?'} 人${suffix}`;
    });
    await ctx.paginate({
      items,
      emptyText: 'Bot 尚未加入任何伺服器',
      render: (page) => ({
        title: `🏠 Bot 所在伺服器(共 ${guilds.length} 個)`,
        description: page.join('\n'),
        color: Colors.INFO,
      }),
    });
  });

  return h.collect();
}
