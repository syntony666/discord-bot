import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replyError, replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { roleMention } from 'shared/utils/discord.utils';
import { formatEmojiForDisplay } from '@features/reaction-role/internal/emoji.helper';

const log = createLogger('ReactionRoleRole');

export async function handleList(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;

  try {
    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
      });
      return;
    }

    const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

    if (roles.length === 0) {
      await replyInfo(bot, interaction, {
        title: `${panel.title} - Reaction Roles`,
        description: '此 Panel 尚未添加任何 Reaction Role。\n使用 `/reaction-role add` 來添加。',
      });
      return;
    }

    const description = roles
      .map((role, index) => {
        const displayEmoji = formatEmojiForDisplay(role.emoji);
        return [
          `**${index + 1}.** ${displayEmoji} → ${roleMention(role.roleId)}`,
          role.description ? `   └ ${role.description}` : '',
          `   \`emoji: ${role.emoji}\``,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    await replyInfo(bot, interaction, {
      title: `${panel.title} - Reaction Roles (${roles.length} 個)`,
      description: description + '\n\n**提示**: 移除時請複製上方的 `emoji:` 值使用。',
    });
  } catch (error) {
    log.error({ error, guildId, panelId }, 'Failed to list reaction roles');
    await handleError(bot, interaction, error, 'reactionRoleList');
  }
}
