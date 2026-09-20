import { getBotVersion, getUptime } from '@core/bot-info';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { MessageComponents } from '@core/discord/discord.types';
import { logger } from '@core/logger';
import { BotInteraction } from '@core/rx/bus';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { avatarUrl } from 'shared/utils/discord.utils';

export async function handleBotStatus(interaction: BotInteraction, actions: DiscordActions) {
  try {
    const version = getBotVersion();
    const uptime = getUptime();
    const nodeVersion = process.version;

    const botUser = await actions.getUser(actions.botId);
    const botIcon = avatarUrl(actions.botId, botUser.avatar, botUser.discriminator);

    const statusButtons: MessageComponents = [
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
        { name: 'discord-api-types', value: `\`v${version.apiTypesVersion}\``, inline: true },
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
      { guildId: interaction.guild_id, latency: `${latency}ms` },
      'Bot status displayed'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to display bot status');
    await handleError(actions, interaction, error, 'status');
  }
}
