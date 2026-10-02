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

  const TIER_ICON: Record<string, string> = { NORMAL: '⬜', PREMIUM: '🟣', HOME: '🏠' };

  h.handler('guild.list', async (ctx) => {
    const [guilds, records] = await Promise.all([discord.getBotGuilds(), api.listGuilds()]);
    const tiers = new Map(records.map((g) => [g.id, g.tier]));
    await ctx.paginate({
      items: guilds,
      emptyText: 'Bot 尚未加入任何伺服器',
      render: (page) => ({
        title: `所在伺服器 (共 ${guilds.length} 個)`,
        color: Colors.INFO,
        fields: page.map((g) => {
          const tier = tiers.get(g.id);
          return {
            name: `${tier ? TIER_ICON[tier] : '⚠️'} ${g.name}`,
            value: `\`${g.id}\` · ${g.approximate_member_count ?? '?'} 人`,
          };
        }),
      }),
    });
  });

  h.handler('guild.info', async (ctx) => {
    const guildId = ctx.options.guild_id ?? ctx.guildId;
    if (!guildId) return ctx.error('請提供 guild_id,或在伺服器中使用此指令');

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('此伺服器不在資料庫中(可用 /bot guild sync 補登)');

    const cap = (n: number) => (n < 0 ? '∞' : String(n));
    const flag = (on: boolean) => (on ? '✅' : '❌');
    const { limits, counts, features } = guild;
    await ctx.reply({
      embeds: [
        {
          title: `📋 ${guild.name}`,
          color: Colors.INFO,
          fields: [
            { name: 'ID', value: guild.id, inline: true },
            { name: 'Tier', value: guild.tier, inline: true },
            { name: '加入時間', value: guild.createdAt.slice(0, 10), inline: true },
            {
              name: '用量',
              value:
                `監控 ${counts.streamWatchers}/${cap(limits.streamWatchers)} · ` +
                `關鍵字 ${counts.keywordRules}/${cap(limits.keywordRules)} · ` +
                `面板 ${counts.reactionRolePanels}/${cap(limits.reactionRolePanels)}`,
            },
            {
              name: '功能',
              value:
                `${flag(features.memberJoin)} 加入通知 · ${flag(features.memberLeave)} 離開通知 · ` +
                `${flag(features.streamNotify)} 直播通知 · ${flag(counts.reactionRolePanels > 0)} 身分組面板`,
            },
          ],
        },
      ],
    });
  });

  return h.collect();
}
