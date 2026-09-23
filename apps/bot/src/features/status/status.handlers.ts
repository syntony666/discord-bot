import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import {
  DiscordSnowflake,
  Formatters,
  useHandlers,
} from '@discord-bot/discord-client';
import type {
  APIActionRowComponent,
  APIButtonComponentWithURL,
  APIEmbed,
} from 'discord-api-types/v10';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import type { KeywordApi } from '@features/keyword/keyword.api';
import type { MemberNotifyApi } from '@features/member-notify/member-notify.api';
import type { ReactionRoleApi } from '@features/reaction-role/reaction-role.api';
import type { StreamNotifyApi } from '@features/stream-notify/stream-notify.api';
import { getBotVersion, getUptime } from './bot-info';
import { appConfig } from '@core/config';
import { createLogger } from '@discord-bot/shared';
import { statusCommand } from './status.command';
import { avatarUrl, guildIconUrl } from './status.utils';
import { buildFeaturesStatusFields } from './status.service';

const log = createLogger('Status');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface StatusDeps {
  discord: DiscordHelpers;
  api: {
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
      return ctx.error('Bot 尚未就緒');
    }
    const botIcon = avatarUrl(botUser.id, botUser.avatar, botUser.discriminator);

    const components: APIActionRowComponent<APIButtonComponentWithURL>[] = [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: '使用說明',
            url: 'https://github.com/syntony666/discord-bot#readme',
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
      description:
        '你想知道什麼呢?\n\n製作: @sakurashigure ‧ [Twitter(X)](https://x.com/SakuraShigure99)',
      author: { name: '自我介紹' },
      thumbnail: botIcon ? { url: botIcon } : undefined,
      fields: [
        { name: 'Uptime', value: `\`${getUptime()}\``, inline: false },
        {
          name: 'API Latency',
          value:
            typeof latency === 'number' ? `\`${latency}ms\`` : `\`${latency}\``,
          inline: false,
        },
        { name: 'Node.js', value: `\`${process.version}\``, inline: true },
        {
          name: 'discord-api-types',
          value: `\`v${version.apiTypesVersion}\``,
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
    log.info(
      { guildId: ctx.guildId, latency: `${Date.now() - start}ms` },
      'Bot status displayed'
    );
  });

  h.handler('guild', async (ctx) => {
    if (!ctx.guildId) return ctx.error('無法取得伺服器資訊');

    const guild = await discord.getGuild(ctx.guildId);
    const owner = await discord.getUser(guild.owner_id);
    const icon = guildIconUrl(guild.id, guild.icon);

    await ctx.reply({
      embeds: [
        {
          title: guild.name,
          thumbnail: icon ? { url: icon } : undefined,
          fields: [
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
          ],
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
    if (!ctx.guildId) return ctx.error('無法取得伺服器資訊');

    const fields = await buildFeaturesStatusFields(
      ctx.guildId,
      deps.api,
      discord.commandMention
    );
    await ctx.reply({
      embeds: [
        fields.length > 0
          ? { title: '功能狀態總覽', fields }
          : { title: '功能狀態總覽', description: '目前沒有啟用任何功能' },
      ],
    });
    log.info({ guildId: ctx.guildId }, 'Features status displayed');
  });

  return h.collect();
}
