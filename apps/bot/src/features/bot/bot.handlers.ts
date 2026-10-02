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

  h.handler('guild.tier', async (ctx) => {
    const guildId = ctx.options.guild_id ?? ctx.guildId;
    if (!guildId) return ctx.error('請提供 guild_id,或在伺服器中使用此指令');
    const tier = ctx.options.tier;

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('此伺服器不在資料庫中(可用 /bot guild sync 補登)');

    const wasHome = (await api.listGuilds()).find((g) => g.tier === 'HOME' && g.id !== guildId);
    await api.setTier(guildId, tier);

    const demoted = tier === 'HOME' && wasHome ? `\n(舊的 HOME:${wasHome.name} 已降為 NORMAL)` : '';
    await ctx.success(`已將 ${guild.name} 設為 ${tier}${demoted}`);
  });

  h.handler('guild.leave', async (ctx) => {
    const guildId = ctx.options.guild_id;
    const record = await api.getGuild(guildId);
    const name = record?.name ?? guildId;

    const ok = await ctx.confirm({
      title: '⚠️ 退出伺服器',
      description: `確定要讓 bot 退出「${name}」?其所有設定資料將被刪除。`,
      confirmLabel: '退出',
      danger: true,
    });
    if (!ok) {
      return ctx.editReply({
        embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
        components: [],
      });
    }

    await discord.leaveGuild(guildId);
    await ctx.editReply({
      embeds: [{ title: '✅', description: `已退出「${name}」`, color: Colors.SUCCESS }],
      components: [],
    });
  });

  return h.collect();
}
