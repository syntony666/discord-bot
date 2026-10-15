import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { DiscordSnowflake, Formatters, useHandlers } from '@discord-bot/discord-client';
import type {
  APIActionRowComponent,
  APIButtonComponentWithURL,
  APIEmbed,
} from 'discord-api-types/v10';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import type { GuildApi } from '@features/guild/guild.api';
import { TIER_ICON, formatUsage } from '@features/guild/guild.tier';
import type { KeywordApi } from '@features/keyword/keyword.api';
import type { MemberNotifyApi } from '@features/notify/member.api';
import type { ReactionRoleApi } from '@features/reaction-role/reaction-role.api';
import type { StreamNotifyApi } from '@features/notify/stream.api';
import { getBotVersion, getUptime } from './bot-info';
import { appConfig } from '@core/config';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import { statusCommand } from './status.command';
import { avatarUrl, guildIconUrl } from './status.utils';
import { buildFeaturesStatusFields } from './status.service';

const log = createLogger('Status');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface StatusDeps {
  discord: DiscordHelpers;
  api: {
    guild: GuildApi;
    memberNotify: MemberNotifyApi;
    streamNotify: StreamNotifyApi;
    keyword: KeywordApi;
    reactionRole: ReactionRoleApi;
  };
}

export function useStatusHandlers(deps: StatusDeps) {
  const { discord } = deps;
  const h = useHandlers(statusCommand);

  h.handler('bot', async (ctx) => {
    const version = getBotVersion();
    const botUser = discord.botUser;
    if (!botUser) {
      return ctx.error('錯誤', '機器人尚未就緒');
    }
    const botIcon = avatarUrl(botUser.id, botUser.avatar);

    const components: APIActionRowComponent<APIButtonComponentWithURL>[] = [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: '使用說明',
            url: 'https://discord-bot.syntony666.com',
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: '邀請連結',
            url: `https://discord.com/api/oauth2/authorize?client_id=${discord.botId}&permissions=8&scope=bot%20applications.commands`,
          },
        ],
      },
    ];

    const embed = (latency: string | number): APIEmbed => ({
      title: botUser.username,
      color: Colors.INFO,
      description:
        '你想知道什麼呢？\n\n製作：@sakurashigure_retry ‧ [Twitter(X)](https://x.com/SakuraShigure99)',
      thumbnail: botIcon ? { url: botIcon } : undefined,
      fields: [
        { name: 'Uptime', value: `\`${getUptime()}\``, inline: false },
        {
          name: 'API Latency',
          value: typeof latency === 'number' ? `\`${latency}ms\`` : `\`${latency}\``,
          inline: true,
        },
        {
          name: 'WS Ping',
          value: `\`${discord.wsPing > 0 ? `${discord.wsPing}ms` : '—'}\``,
          inline: true,
        },
      ],
      footer: {
        text: `ver. ${version.version}`,
        icon_url: appConfig.footerIconUrl,
      },
    });

    const start = Date.now();
    await ctx.reply({ embeds: [embed('計算中...')], components });
    await ctx.editReply({
      embeds: [embed(Date.now() - start)],
      components,
    });
    log.info({ guildId: ctx.guildId, latency: `${Date.now() - start}ms` }, 'Bot status displayed');
  });

  h.handler('guild', async (ctx) => {
    const [guild, record] = await Promise.all([
      discord.getGuild(ctx.guildId),
      deps.api.guild.getGuild(ctx.guildId),
    ]);
    const owner = await discord.getUser(guild.owner_id);
    const icon = guildIconUrl(guild.id, guild.icon);

    const fields: APIEmbed['fields'] = [
      {
        name: '創立時間',
        value: Formatters.time(
          new Date(DiscordSnowflake.timestampFrom(guild.id)),
          Formatters.TimestampStyles.LongDateShortTime
        ),
        inline: false,
      },
      {
        name: '成員',
        value: `${guild.approximate_member_count || 0} 人`,
        inline: true,
      },
      {
        name: '在線',
        value: `${guild.approximate_presence_count || 0} 人`,
        inline: true,
      },
      {
        name: '擁有者',
        value: Formatters.userMention(owner.id),
        inline: false,
      },
    ];
    if (record) {
      const { limits, counts } = record;
      fields.push({
        name: '用量',
        value:
          `監控 ${formatUsage(counts.streamWatchers, limits.streamWatchers)} · ` +
          `關鍵字 ${formatUsage(counts.keywordRules, limits.keywordRules)} · ` +
          `身分組選單 ${formatUsage(counts.reactionRolePanels, limits.reactionRolePanels)}`,
        inline: false,
      });
    }

    await ctx.reply({
      embeds: [
        {
          title: record ? `${TIER_ICON[record.tier]} ${guild.name}` : guild.name,
          color: Colors.INFO,
          thumbnail: icon ? { url: icon } : undefined,
          fields,
          footer: {
            text: `${guild.id}`,
            icon_url: appConfig.footerIconUrl,
          },
        },
      ],
    });
    log.info({ guildId: ctx.guildId }, 'Guild status displayed');
  });

  h.handler('features', async (ctx) => {
    const fields = await buildFeaturesStatusFields(ctx.guildId, deps.api, discord.commandMention);
    await ctx.reply({
      embeds: [
        fields.length > 0
          ? { title: '功能狀態總覽', color: Colors.INFO, fields }
          : { title: '功能狀態總覽', color: Colors.INFO, description: '目前沒有啟用任何功能' },
      ],
    });
    log.info({ guildId: ctx.guildId }, 'Features status displayed');
  });

  return h.collect();
}
