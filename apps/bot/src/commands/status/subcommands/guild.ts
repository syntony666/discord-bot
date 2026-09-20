import { logger } from '@core/logger';
import type { DiscordActions } from '@core/discord/discord-actions';
import { BotGuild, BotInteraction, BotUser } from '@core/rx/bus';
import { appConfig } from '@core/config';
import { replyInfo } from 'shared/message/message.helper';
import { handleError } from 'shared/error';
import { userMention, timestampShort, guildIconUrl } from 'shared/utils/discord.utils';

export async function handleGuildStatus(interaction: BotInteraction, actions: DiscordActions) {
  const guildId = interaction.guild_id;

  if (!guildId) {
    await handleError(actions, interaction, new Error('Guild ID missing'), 'status');
    return;
  }

  try {
    const guild = (await actions.getGuild(guildId)) as BotGuild;
    const owner = (await actions.getUser(guild.owner_id)) as BotUser;
    const createdAt = new Date(Number((BigInt(guild.id) >> 22n) + 1420070400000n));
    const guildIcon = guildIconUrl(guild.id, guild.icon);

    await replyInfo(actions, interaction, {
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
    await handleError(actions, interaction, error, 'status');
  }
}
