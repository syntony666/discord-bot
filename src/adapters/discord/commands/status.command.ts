import { getBotVersion, getUptime } from '@core/bot-info';
import { logger } from '@core/logger';
import { BotChannel, BotGuild, BotInteraction, BotUser } from '@core/rx/bus';
import {
  avatarUrl,
  Bot,
  ButtonStyles,
  guildIconUrl,
  InteractionCallbackData,
  InteractionResponseTypes,
  MessageComponentTypes,
} from '@discordeno/bot';
import { commandRegistry } from './command.registry';
import { appConfig, CommandColors } from '@core/config';
import { replyInfo } from '@adapters/discord/shared/message/message.helper';

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
  const version = getBotVersion();
  const uptime = getUptime();
  const nodeVersion = process.version;

  const botUser = (await bot.helpers.getUser(bot.id)) as BotUser;

  const botIcon = avatarUrl(bot.id, botUser.discriminator);

  // Send initial response with "Calculating..." ping
  const startTime = Date.now();

  await replyInfo(bot, interaction, {
    title: botUser.username,
    description:
      '你想知道什麼呢?\n\n製作: @sakurashigure ‧ [Twitter(X)](https://x.com/SakuraShigure99)',
    fields: [
      { name: 'Uptime', value: `\`${uptime}\``, inline: false },
      { name: 'API Latency', value: `\`計算中...\``, inline: false },
      { name: 'Node.js', value: `\`${nodeVersion}\``, inline: true },
      { name: 'Discordeno', value: `\`v${version.discordenoVersion}\``, inline: true },
    ],
    components: [
      {
        type: MessageComponentTypes.ActionRow,
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
    ],
  });

  const latency = Date.now() - startTime;

  // Update with actual latency
  await bot.helpers.editOriginalInteractionResponse(interaction.token, {
    embeds: [
      {
        title: botUser.username,
        description:
          '你想知道什麼呢?\n\n製作: @sakurashigure ‧ [Twitter(X)](https://x.com/SakuraShigure99)',
        author: {
          name: '自我介紹',
        },
        color: CommandColors.INFO,
        thumbnail: botIcon
          ? {
              url: botIcon,
            }
          : undefined,
        fields: [
          { name: 'Uptime', value: `\`${uptime}\``, inline: false },
          { name: 'API Latency', value: `\`${latency}ms\``, inline: false },
          { name: 'Node.js', value: `\`${nodeVersion}\``, inline: true },
          { name: 'Discordeno', value: `\`v${version.discordenoVersion}\``, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `ver. ${version.version}`,
          iconUrl: appConfig.footerIconUrl,
        },
      },
    ],
    components: [
      {
        type: MessageComponentTypes.ActionRow,
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
    ],
  });

  logger.info(
    { guildId: interaction.guildId?.toString(), latency: `${latency}ms` },
    'Bot status displayed'
  );
}

async function handleGuildStatus(interaction: BotInteraction, bot: Bot) {
  const guildId = interaction.guildId;
  const version = getBotVersion();

  if (!guildId) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: InteractionResponseTypes.ChannelMessageWithSource,
      data: {
        content: '此指令只能在伺服器中使用',
        flags: 64,
      },
    });
    return;
  }

  const guild = (await bot.helpers.getGuild(guildId)) as BotGuild;
  const owner = (await bot.helpers.getUser(guild.ownerId)) as BotUser;

  const createdAt = new Date(Number((guild.id >> 22n) + 1420070400000n));
  const formattedDate = createdAt.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const guildIcon = guildIconUrl(guild.id, guild.icon, { size: 256 });

  await replyInfo(bot, interaction, {
    title: guild.name,
    description: undefined!,
    fields: [
      {
        name: '創立時間',
        value: `<t:${Math.floor(createdAt.getTime() / 1000)}>`,
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
        value: `<@${owner.id}>`,
        inline: false,
      },
    ],
  });

  logger.info({ guildId: guildId.toString() }, 'Guild status displayed');
}
