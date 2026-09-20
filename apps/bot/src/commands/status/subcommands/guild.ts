import { logger } from '@core/logger';
import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { DiscordSnowflake, Formatters } from '@discord-bot/discord-client';
import { guildIconUrl } from 'shared/utils/discord.utils';

export async function handleGuildStatus(interaction: BotInteraction, actions: DiscordActions) {
  const guildId = interaction.guild_id;

  if (!guildId) {
    await handleError(actions, interaction, new Error('Guild ID missing'), 'status');
    return;
  }

  try {
    const guild = await actions.getGuild(guildId);
    const owner = await actions.getUser(guild.owner_id);
    const createdAt = new Date(DiscordSnowflake.timestampFrom(guild.id));
    const guildIcon = guildIconUrl(guild.id, guild.icon);

    await replyInfo(actions, interaction, {
      title: guild.name,
      thumbnail: guildIcon ? { url: guildIcon } : undefined,
      fields: [
        {
          name: '創立時間',
          value: Formatters.time(createdAt, Formatters.TimestampStyles.LongDateShortTime),
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
    });

    logger.info({ guildId }, 'Guild status displayed');
  } catch (error) {
    logger.error({ error, guildId }, 'Failed to display guild status');
    await handleError(actions, interaction, error, 'status');
  }
}
