import { getBotVersion, getUptime } from '@core/bot-info';
import { logger } from '@core/logger';
import { BotChannel, BotGuild, BotInteraction, BotUser } from '@core/rx/bus';
import {
  Bot,
  ButtonStyles,
  InteractionCallbackData,
  InteractionResponseTypes,
  MessageComponentTypes,
} from '@discordeno/bot';
import { commandRegistry } from './command.registry';

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

  // 建立 embed 的輔助函數
  const createStatusEmbed = (ping: string | number) =>
    ({
      embeds: [
        {
          title: '📊 Bot Status',
          description:
            '一個模組化的 Discord 機器人\n使用 TypeScript + Discordeno + RxJS + Prisma 構建',
          color: 0x5865f2,
          fields: [
            { name: 'Version', value: `${version.version}`, inline: true },
            { name: 'Uptime', value: `${uptime}`, inline: true },
            {
              name: 'Ping',
              value: typeof ping === 'number' ? `${ping}ms` : `${ping}`,
              inline: true,
            },
            { name: 'Node.js', value: `${nodeVersion}`, inline: true },
            { name: 'Discordeno', value: `${version.discordenoVersion}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: '使用說明',
              url: 'https://github.com/syntony666/discord-bot#readme',
            },
            {
              type: 2,
              style: 5,
              label: '邀請連結',
              url: `https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands`,
            },
          ],
        },
      ],
    }) as InteractionCallbackData;

  const startTime = Date.now();

  await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: InteractionResponseTypes.ChannelMessageWithSource,
    data: createStatusEmbed('計算中...'),
  });

  const latency = Date.now() - startTime;

  await bot.helpers.editOriginalInteractionResponse(interaction.token, createStatusEmbed(latency));

  logger.info(
    { guildId: interaction.guildId?.toString(), latency: `${latency}ms` },
    'Bot status displayed'
  );
}

async function handleGuildStatus(interaction: BotInteraction, bot: Bot) {
  const guildId = interaction.guildId;
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
  const channels = (await bot.helpers.getChannels(guildId)) as BotChannel[];
  const owner = (await bot.helpers.getUser(guild.ownerId)) as BotUser;

  const textChannels = channels.filter((c) => c.type === 0).length;
  const voiceChannels = channels.filter((c) => c.type === 2).length;

  const createdAt = new Date(Number((guild.id >> 22n) + 1420070400000n));
  const formattedDate = createdAt.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
    type: 4,
    data: {
      embeds: [
        {
          title: '伺服器資訊',
          description: guild.name,
          color: 0x5865f2,
          thumbnail: guild.icon
            ? {
                url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`,
              }
            : undefined,
          fields: [
            {
              name: '創立時間',
              value: formattedDate,
              inline: false,
            },
            {
              name: '成員',
              value: `${guild.memberCount || 0} 人`,
              inline: true,
            },
            {
              name: '在線',
              value: `${guild.approximatePresenceCount || 0} 人`,
              inline: true,
            },
            {
              name: '擁有者',
              value: `${owner.username}`,
              inline: true,
            },
            {
              name: '文字頻道',
              value: `${textChannels} 個`,
              inline: true,
            },
            {
              name: '語音頻道',
              value: `${voiceChannels} 個`,
              inline: true,
            },
          ],
          footer: {
            text: `伺服器 ID: ${guild.id}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });

  logger.info({ guildId: guildId.toString() }, 'Guild status displayed');
}
