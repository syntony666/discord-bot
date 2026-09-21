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
import type { DiscordActions } from '@discord-bot/discord-client';
import type { KeywordModule } from '@features/keyword/keyword.module';
import type { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import type { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import type { StreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { getBotVersion, getUptime } from '@core/bot-info';
import { appConfig } from '@core/config';
import { createLogger } from '@discord-bot/shared';
import { statusCommand } from './status.command';
import { avatarUrl, guildIconUrl } from './status.utils';
import { buildNotifyStatusItems } from './status.service';

const log = createLogger('Status');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface StatusDeps {
  actions: DiscordActions;
  modules: {
    memberNotify: MemberNotifyModule;
    streamNotify: StreamNotifyModule;
    keyword: KeywordModule;
    reactionRole: ReactionRoleModule;
  };
}

export function useStatusHandlers(deps: StatusDeps) {
  const { actions } = deps;
  const h = useHandlers(statusCommand);

  h.handler('bot', async (ctx) => {
    const version = getBotVersion();
    const botUser = actions.botUser;
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
            url: `https://discord.com/api/oauth2/authorize?client_id=${actions.botId}&permissions=8&scope=bot%20applications.commands`,
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

    const guild = await actions.getGuild(ctx.guildId);
    const owner = await actions.getUser(guild.owner_id);
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

  h.handler('notify', async (ctx) => {
    if (!ctx.guildId) return ctx.error('無法取得伺服器資訊');

    const items = await buildNotifyStatusItems(ctx.guildId, deps.modules);
    await ctx.paginate({
      items,
      pageSize: 10,
      emptyText: '目前沒有啟用任何通知功能',
      render: (page) => ({
        title: '🔔 通知功能總覽',
        description: page.join('\n'),
      }),
    });
    log.info({ guildId: ctx.guildId }, 'Notify status displayed');
  });

  return h.collect();
}
