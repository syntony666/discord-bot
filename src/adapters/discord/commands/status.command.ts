import { getBotVersion, getUptime } from '@core/bot-info';
import { logger } from '@core/logger';
import { BotGuild, BotInteraction, BotUser } from '@core/rx/bus';
import {
  avatarUrl,
  Bot,
  ButtonStyles,
  guildIconUrl,
  MessageComponents,
  MessageComponentTypes,
} from '@discordeno/bot';
import { commandRegistry } from './command.registry';
import { appConfig } from '@core/config';
import { replyInfo } from '@adapters/discord/shared/message/message.helper';
import { handleError } from '@adapters/discord/shared/error';
import { userMention, timestampShort } from '@adapters/discord/shared/utils/discord.utils';

export function createStatusCommandHandler(bot: Bot) {
  commandRegistry.registerCommand('status', async (interaction: BotInteraction, bot: Bot) => {
    const subcommand = interaction.data?.options?.[0];
    if (!subcommand) return;

    if (subcommand.name === 'bot') {
      await handleBotStatus(interaction, bot);
    } else if (subcommand.name === 'guild') {
      await handleGuildStatus(interaction, bot);
    }
  });
}

async function handleBotStatus(interaction: BotInteraction, bot: Bot) {
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

async function handleGuildStatus(interaction: BotInteraction, bot: Bot) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await handleError(bot, interaction, new Error('Guild ID missing'), 'status');
    return;
  }

  try {
    const guild = (await bot.helpers.getGuild(guildId)) as BotGuild;
    const owner = (await bot.helpers.getUser(guild.ownerId)) as BotUser;
    const createdAt = new Date(Number((guild.id >> 22n) + 1420070400000n));
    const guildIcon = guildIconUrl(guild.id, guild.icon, { size: 256 });

    await replyInfo(bot, interaction, {
      title: guild.name,
      thumbnail: guildIcon ? { url: guildIcon } : undefined,
      fields: [
        {
          name: '創立時間',
          value: timestampShort(createdAt),
          inline: false,
        },
        {
          name: '成員',
          value: `${guild.approximateMemberCount || 0} 人`,
          inline: true,
        },
        {
          name: '在線',
          value: `${guild.approximatePresenceCount || 0} 人`,
          inline: true,
        },
        {
          name: '擁有者',
          value: userMention(owner.id),
          inline: false,
        },
      ],
      footer: {
        text: `${guild.id}`,
        icon_url: appConfig.footerIconUrl,
      },
    });

    logger.info({ guildId: guildId.toString() }, 'Guild status displayed');
  } catch (error) {
    logger.error({ error, guildId: guildId?.toString() }, 'Failed to display guild status');
    await handleError(bot, interaction, error, 'status');
  }
}
