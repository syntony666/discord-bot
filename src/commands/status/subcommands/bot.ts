import { getBotVersion, getUptime } from '@core/bot-info';
import { logger } from '@core/logger';
import { BotInteraction, BotUser } from '@core/rx/bus';
import {
  avatarUrl,
  Bot,
  ButtonStyles,
  MessageComponents,
  MessageComponentTypes,
} from '@discordeno/bot';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';

/**
 * Handle /status bot
 */
export async function handleBotStatus(interaction: BotInteraction, bot: Bot) {
  try {
    const version = getBotVersion();
    const uptime = getUptime();
    const nodeVersion = process.version;

    const botUser = (await bot.helpers.getUser(bot.id)) as BotUser;
    const botIcon = avatarUrl(bot.id, botUser.discriminator);

    const statusButtons: MessageComponents = [
      {
        type: 1,
        components: [
          {
            type: MessageComponentTypes.Button,
            style: ButtonStyles.Link,
            label: '使用說明',
            url: 'https://github.com/syntony666/discord-bot#readme',
          },
          {
            type: MessageComponentTypes.Button,
            style: ButtonStyles.Link,
            label: '邀請連結',
            url: `https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands`,
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

    await replyInfo(bot, interaction, createStatusEmbed('計算中...'));

    const latency = Date.now() - startTime;

    await replyInfo(bot, interaction, {
      ...createStatusEmbed(latency),
      isEdit: true,
    });

    logger.info(
      { guildId: interaction.guildId?.toString(), latency: `${latency}ms` },
      'Bot status displayed'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to display bot status');
    await handleError(bot, interaction, error, 'status');
  }
}
