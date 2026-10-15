import { useHandlers } from '@discord-bot/discord-client';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { GuildApi } from '@features/guild/guild.api';
import { TIER_ICON, tierName, formatUsage } from '@features/guild/guild.tier';
import { botCommand } from './bot.command';
import type { BotApi } from './bot.api';
import { ACTIVITY_LABEL, buildPresence } from './bot.presence';

const log = createLogger('BotAdmin');

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
    if (!guildId) return ctx.error('錯誤', '請提供 guild_id，或在伺服器中使用此指令');

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('錯誤', '此伺服器不在資料庫中（可用 /bot guild sync 補登）');

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
                `監控 ${formatUsage(counts.streamWatchers, limits.streamWatchers)}\n` +
                `關鍵字 ${formatUsage(counts.keywordRules, limits.keywordRules)}\n` +
                `身分組選單 ${formatUsage(counts.reactionRolePanels, limits.reactionRolePanels)}`,
            },
            {
              name: '功能',
              value:
                `${flag(features.memberJoin)} 加入通知\n` +
                `${flag(features.memberLeave)} 離開通知\n` +
                `${flag(features.streamNotify)} 直播通知\n` +
                `${flag(counts.reactionRolePanels > 0)} 身分組選單`,
            },
          ],
        },
      ],
    });
  });

  h.handler('guild.tier', async (ctx) => {
    const guildId = ctx.options.guild_id ?? ctx.guildId;
    if (!guildId) return ctx.error('錯誤', '請提供 guild_id，或在伺服器中使用此指令');
    const tier = ctx.options.tier;

    const guild = await api.getGuild(guildId);
    if (!guild) return ctx.error('錯誤', '此伺服器不在資料庫中（可用 /bot guild sync 補登）');

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

  h.handler('profile.about', async (ctx) => {
    const { text } = ctx.options;
    await discord.editApplication({ description: text });
    await ctx.reply({
      embeds: [
        {
          title: '自我介紹已更新',
          description: `**${text.length > 100 ? `${text.slice(0, 100)}…` : text}**`,
          color: Colors.SUCCESS,
        },
      ],
    });
  });

  h.handler('limit', async (ctx) => {
    const { tier, watchers, keywords, panels } = ctx.options;
    const patch: Record<string, number> = {};
    if (watchers !== undefined) patch.streamWatchers = watchers;
    if (keywords !== undefined) patch.keywordRules = keywords;
    if (panels !== undefined) patch.reactionRolePanels = panels;
    if (Object.keys(patch).length === 0) {
      return ctx.error('錯誤', '請提供至少一個要調整的額度');
    }

    const updated = await botApi.updateTierLimit(tier, patch);
    const cap = (n: number) => (n < 0 ? '∞' : String(n));
    await ctx.reply({
      embeds: [
        {
          title: '額度已更新',
          description:
            `**${updated.tier}**\n` +
            `監控 ${cap(updated.streamWatchers)} · 關鍵字 ${cap(updated.keywordRules)} · 身分組選單 ${cap(updated.reactionRolePanels)}`,
          color: Colors.SUCCESS,
        },
      ],
    });
  });

  h.handler('announce', async (ctx) => {
    const { message, tier } = ctx.options;
    const targets = (await api.listGuilds()).filter((g) => !tier || g.tier === tier);
    if (targets.length === 0) return ctx.error('錯誤', '沒有符合條件的伺服器');

    // Resolve owners first and dedupe — one user may own several guilds.
    const owners = new Map<string, string[]>();
    const failed: string[] = [];
    for (const g of targets) {
      try {
        const guild = await discord.getGuild(g.id);
        owners.set(guild.owner_id, [...(owners.get(guild.owner_id) ?? []), g.name]);
      } catch (err) {
        log.warn({ err, guildId: g.id }, 'Failed to fetch guild for announce');
        failed.push(g.name);
      }
    }
    if (owners.size === 0) return ctx.error('錯誤', '無法取得任何伺服器擁有者資訊');

    const ok = await ctx.confirm({
      title: '發送公告',
      description:
        `將私訊 ${owners.size} 位擁有者（共 ${targets.length} 個伺服器` +
        `${tier ? `，級別 ${tier}` : ''}）。`,
      fields: [{ name: '公告內容', value: message }],
      confirmLabel: '發送',
      cancelLabel: '取消',
    });
    if (!ok) {
      return ctx.editReply({
        embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
      });
    }

    let sent = 0;
    for (const [ownerId, names] of owners) {
      try {
        const dm = await discord.openDm(ownerId);
        await discord.sendMessage(dm.id, {
          embeds: [
            {
              title: '公告',
              description: message,
              color: Colors.INFO,
              footer: {
                text: `來自 ${discord.botUser?.username ?? 'bot'} 的開發者 · @${ctx.user.username}`,
              },
            },
          ],
        });
        sent++;
      } catch (err) {
        log.warn({ err, ownerId }, 'Failed to DM guild owner');
        failed.push(...names);
      }
    }

    await ctx.editReply({
      embeds: [
        {
          title: '公告已送出',
          description:
            `已發送給 ${sent} 位擁有者` +
            (failed.length
              ? `\n失敗 ${failed.length} 位：${failed.map((n) => `**${n}**`).join('、')}`
              : ''),
          color: Colors.SUCCESS,
        },
      ],
    });
  });

  h.handler('stats', async (ctx) => {
    const [stats, guilds] = await Promise.all([botApi.getStats(), discord.getBotGuilds()]);
    const cap = (n: number) => (n < 0 ? '∞' : String(n));
    const up = process.uptime();
    const uptime =
      up >= 86400
        ? `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h`
        : up >= 3600
          ? `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`
          : `${Math.floor(up / 60)}m`;

    await ctx.reply({
      embeds: [
        {
          title: '全域統計',
          color: Colors.INFO,
          fields: [
            {
              name: '伺服器',
              value: `Discord **${guilds.length}** · 資料庫 **${stats.guilds}**`,
            },
            {
              name: '監控',
              value: `**${stats.watchers}** 個（🔴 ${stats.liveWatchers} 直播中）`,
            },
            { name: '關鍵字', value: `**${stats.keywordRules}** 條` },
            { name: '身分組選單', value: `**${stats.reactionRolePanels}** 個` },
            {
              name: '級別分佈',
              value:
                `⚪ NORMAL × ${stats.tierCounts['NORMAL'] ?? 0}\n` +
                `🟣 PREMIUM × ${stats.tierCounts['PREMIUM'] ?? 0}\n` +
                `🟡 HOME × ${stats.tierCounts['HOME'] ?? 0}`,
            },
            {
              name: '額度',
              value: stats.limits
                .map(
                  (l) =>
                    `**${l.tier}**　監控 ${cap(l.streamWatchers)} · 關鍵字 ${cap(l.keywordRules)} · 身分組選單 ${cap(l.reactionRolePanels)}`
                )
                .join('\n'),
            },
            {
              name: '狀態',
              value: `運行 ${uptime} · WS ${discord.wsPing}ms`,
            },
          ],
        },
      ],
    });
  });

  return h.collect();
}
