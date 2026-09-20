import { getBotVersion, getUptime } from '@core/bot-info';
import type { DiscordActions } from '@core/discord/discord-actions';
import { logger } from '@core/logger';
import { BotInteraction, BotUser } from '@core/rx/bus';
import { avatarUrl, Bot } from '@discordeno/bot';
import type { MessageComponents } from '@core/discord/discord.types';
import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';

export async function handleBotStatus(interaction: BotInteraction, actions: DiscordActions) {
  try {
    const version = getBotVersion();
    const uptime = getUptime();
    const nodeVersion = process.version;

    const botUser = (await actions.getUser(actions.botId)) as BotUser;
    const botIcon = avatarUrl(actions.botId, botUser.discriminator);

    const statusButtons: MessageComponents = [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: '使用說明',
            url: 'https://github.com/syntony666/discord-actions#readme',
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

    const createStatusEmbed = (latency: string | number) => ({
      title: botUser.username,
      description:
        '你想知道什麼呢?\n\n製作: @sakurashigure ‧ [Twitter(X)](https://x.com/SakuraShigure99)',
      author: { name: '自我介紹' },
      thumbnail: botIcon ? { url: botIcon } : undefined,
      fields: [
        { name: 'Uptime', value: `\`${uptime}\``, inline: false },
        {
          name: 'API Latency',
          value: typeof latency === 'number' ? `\`${latency}ms\`` : `\`${latency}\``,
          inline: false,
        },
        { name: 'Node.js', value: `\`${nodeVersion}\``, inline: true },
        { name: 'Discordeno', value: `\`v${version.discordenoVersion}\``, inline: true },
      ],
      footer: {
        text: `ver. ${version.version}`,
        icon_url: appConfig.footerIconUrl,
      },
      components: statusButtons,
    });

    const startTime = Date.now();

    await replyInfo(actions, interaction, createStatusEmbed('計算中...'));

    const latency = Date.now() - startTime;

    await replyInfo(actions, interaction, {
      ...createStatusEmbed(latency),
      isEdit: true,
    });

    logger.info(
      { guildId: interaction.guildId?.toString(), latency: `${latency}ms` },
      'Bot status displayed'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to display actions status');
    await handleError(actions, interaction, error, 'status');
  }
}
