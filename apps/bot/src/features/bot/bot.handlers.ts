import { useHandlers } from '@discord-bot/discord-client';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import type { GuildApi } from '@features/guild/guild.api';
import { botCommand } from './bot.command';
import type { BotApi } from './bot.api';
import { ACTIVITY_LABEL, buildPresence } from './bot.presence';

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface BotDeps {
  discord: DiscordHelpers;
  api: { guild: GuildApi; bot: BotApi };
}

export function useBotHandlers(deps: BotDeps) {
  const { discord } = deps;
  const api = deps.api.guild;
  const botApi = deps.api.bot;
  const h = useHandlers(botCommand);

  const TIER_ICON: Record<string, string> = { NORMAL: '⚪', PREMIUM: '🟣', HOME: '🟡' };
  const tierName = (tier: string) => `${TIER_ICON[tier] ?? ''} ${tier}`;

  h.handler('guild.list', async (ctx) => {
    const [guilds, records] = await Promise.all([discord.getBotGuilds(), api.listGuilds()]);
    const tiers = new Map(records.map((g) => [g.id, g.tier]));
    await ctx.paginate({
      items: guilds,
      emptyText: '尚未加入任何伺服器',
      render: (page) => ({
        title: `所在伺服器（共 ${guilds.length} 個）`,
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
    if (!guildId) return ctx.error('請提供 guild_id，或在伺服器中使用此指令');

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('此伺服器不在資料庫中（可用 /bot guild sync 補登）');

    const cap = (n: number) => (n < 0 ? '∞' : String(n));
    const flag = (on: boolean) => (on ? '✅' : '❌');
    const { limits, counts, features } = guild;
    await ctx.reply({
      embeds: [
        {
          title: guild.name,
          color: Colors.INFO,
          fields: [
            { name: 'ID', value: `\`${guild.id}\``, inline: true },
            { name: '級別', value: tierName(guild.tier), inline: true },
            { name: '加入時間', value: guild.createdAt.slice(0, 10), inline: true },
            {
              name: '用量',
              value:
                `監控 ${counts.streamWatchers}/${cap(limits.streamWatchers)}\n` +
                `關鍵字 ${counts.keywordRules}/${cap(limits.keywordRules)}\n` +
                `面板 ${counts.reactionRolePanels}/${cap(limits.reactionRolePanels)}`,
            },
            {
              name: '功能',
              value:
                `${flag(features.memberJoin)} 加入通知\n` +
                `${flag(features.memberLeave)} 離開通知\n` +
                `${flag(features.streamNotify)} 直播通知\n` +
                `${flag(counts.reactionRolePanels > 0)} 身分組面板`,
            },
          ],
        },
      ],
    });
  });

  h.handler('guild.tier', async (ctx) => {
    const guildId = ctx.options.guild_id ?? ctx.guildId;
    if (!guildId) return ctx.error('請提供 guild_id，或在伺服器中使用此指令');
    const tier = ctx.options.tier;

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('此伺服器不在資料庫中（可用 /bot guild sync 補登）');

    const wasHome = (await api.listGuilds()).find((g) => g.tier === 'HOME' && g.id !== guildId);
    await api.setTier(guildId, tier);

    const demoted =
      tier === 'HOME' && wasHome ? `\n（原 HOME 伺服器 **${wasHome.name}** 已降為 NORMAL）` : '';
    await ctx.reply({
      embeds: [
        {
          title: '級別已更新',
          description: `**${guild.name}** 已設為 ${tier}${demoted}`,
          color: Colors.SUCCESS,
        },
      ],
    });
  });

  h.handler('guild.leave', async (ctx) => {
    const guildId = ctx.options.guild_id;
    const record = await api.getGuild(guildId);
    const name = record?.name ?? guildId;

    const ok = await ctx.confirm({
      title: '⚠️ 退出伺服器',
      description: `確定要退出 **${name}**？其所有設定資料將被刪除。`,
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
      embeds: [
        {
          title: '已退出伺服器',
          description: `已退出 **${name}**`,
          color: Colors.SUCCESS,
        },
      ],
      components: [],
    });
  });

  h.handler('guild.sync', async (ctx) => {
    const [discordGuilds, records] = await Promise.all([discord.getBotGuilds(), api.listGuilds()]);
    const discordIds = new Set(discordGuilds.map((g) => g.id));
    const dbIds = new Set(records.map((g) => g.id));

    const missing = discordGuilds.filter((g) => !dbIds.has(g.id));
    const orphans = records.filter((g) => !discordIds.has(g.id));
    await Promise.all([
      ...missing.map((g) => api.ensureGuild(g.id, g.name)),
      ...orphans.map((g) => api.deleteGuild(g.id)),
    ]);

    if (missing.length === 0 && orphans.length === 0) {
      return ctx.reply({
        embeds: [{ title: '同步完成', description: '無差異', color: Colors.SUCCESS }],
      });
    }
    await ctx.reply({
      embeds: [
        {
          title: '同步完成',
          color: Colors.SUCCESS,
          fields: [
            ...(missing.length
              ? [
                  {
                    name: `新增 ${missing.length} 筆（已加入但無記錄）`,
                    value: missing.map((g) => g.name).join(' · '),
                  },
                ]
              : []),
            ...(orphans.length
              ? [
                  {
                    name: `移除 ${orphans.length} 筆（已退出但殘留）`,
                    value: orphans.map((g) => g.name).join(' · '),
                  },
                ]
              : []),
          ],
        },
      ],
    });
  });

  h.handler('profile.activity', async (ctx) => {
    const { type, text, url } = ctx.options;
    const cfg = { type, text, ...(url !== undefined ? { url } : {}) };

    await discord.updatePresence(buildPresence(cfg));
    await botApi.setState('activity', JSON.stringify(cfg));
    await ctx.reply({
      embeds: [
        {
          title: '活動狀態已更新',
          description: `${ACTIVITY_LABEL[type] ?? ''} **${text}**`,
          color: Colors.SUCCESS,
        },
      ],
    });
  });

  return h.collect();
}
