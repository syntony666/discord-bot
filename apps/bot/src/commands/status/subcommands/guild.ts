import { logger } from '@core/logger';
import { BotGuild, BotInteraction, BotUser } from '@core/rx/bus';
import { Bot, guildIconUrl } from '@discordeno/bot';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { userMention, timestampShort } from 'shared/utils/discord.utils';

export async function handleGuildStatus(interaction: BotInteraction, bot: Bot) {
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
