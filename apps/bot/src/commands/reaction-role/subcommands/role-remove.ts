import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replyError, replySuccess, replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { roleMention } from 'shared/utils/discord.utils';
import { createStandardConfirmation } from '../internal/confirmations';
import { CustomIdPrefixes } from '@core/config/constants';
import { deleteDiscordReaction, updatePanelMessage } from '../internal/operations';
import type { ReactionRoleRemoveData } from '../reaction-role.types';
import {
  normalizeEmojiForStorage,
  formatEmojiForDisplay,
  formatEmojiForReaction,
} from '@features/reaction-role/internal/emoji.helper';

const log = createLogger('ReactionRoleRole');

export async function handleRemove(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;
  const emojiInput = subGroup.options?.find((o) => o.name === 'emoji')?.value as string;
  const userId = interaction.user?.id?.toString() || '';

  const emoji = normalizeEmojiForStorage(emojiInput);

  try {
    const reactionRole = await lastValueFrom(module.getReactionRole$(guildId, panelId, emoji));
    if (!reactionRole) {
      await replyError(bot, interaction, {
        title: 'Reaction Role 不存在',
        description: `在 Panel \`${panelId}\` 中找不到 ${emojiInput} 的綁定。\n\n**提示**: 請使用 \`/reaction-role list\` 查看正確的 emoji 格式。`,
      });
      return;
    }

    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
      });
      return;
    }

    const displayEmoji = formatEmojiForDisplay(emoji);

    await createStandardConfirmation<ReactionRoleRemoveData>(
      bot,
      CustomIdPrefixes.REACTION_ROLE_REMOVE,
      {
        interaction,
        userId,
        guildId,
        data: { guildId, panelId, emoji, panel, reactionRole },
        buttonStyle: 'primary',
        confirmLabel: '確認移除',
        embed: {
          title: '⚠️ 確認移除 Reaction Role',
          description: `即將從 Panel 中移除此 Reaction Role。`,
          fields: [
            {
              name: 'Reaction Role 資訊',
              value: [
                `**Panel**: ${panel.title} (\`${panelId}\`)`,
                `**Emoji**: ${displayEmoji}`,
                `**身分組**: ${roleMention(reactionRole.roleId)}`,
                reactionRole.description ? `**說明**: ${reactionRole.description}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
        onConfirm: async (bot, interaction, data) => {
          try {
            // Step 1: Delete Discord reaction
            const reactionEmoji = formatEmojiForReaction(data.emoji);
            await deleteDiscordReaction(bot, data.panel.channelId, data.panelId, reactionEmoji, {
              guildId: data.guildId,
              panelId: data.panelId,
            });

            // Step 2: Update Discord message
            const currentRoles = await lastValueFrom(
              module.getReactionRolesByMessage$(data.guildId, data.panelId)
            );
            const rolesAfterRemove = currentRoles.filter((r) => r.emoji !== data.emoji);

            await updatePanelMessage(bot, data.panel, rolesAfterRemove);

            // Step 3: Delete database record
            await lastValueFrom(module.deleteReactionRole$(data.guildId, data.panelId, data.emoji));
            log.debug(
              { guildId: data.guildId, panelId: data.panelId, emoji: data.emoji },
              'Database reaction role deleted'
            );

            const displayEmoji = formatEmojiForDisplay(data.emoji);
            await replySuccess(bot, interaction, {
              title: 'Reaction Role 已移除',
              description: `${displayEmoji} 的綁定已從 Panel 中移除。`,
              isEdit: true,
            });

            log.info(
              { guildId: data.guildId, panelId: data.panelId, emoji: data.emoji },
              'Reaction role removed successfully'
            );
          } catch (error) {
            log.error({ error, guildId, panelId }, 'Failed to remove reaction role');
            await handleError(bot, interaction, error, 'reactionRoleRemove');
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyInfo(bot, interaction, {
            title: '已取消',
            description: `已取消移除 Reaction Role。`,
            isEdit: true,
          });
        },
      }
    );

    log.info({ guildId, panelId, emoji }, 'Reaction role remove confirmation requested');
  } catch (error) {
    log.error({ error, guildId, panelId }, 'Failed to prepare reaction role remove confirmation');
    await handleError(bot, interaction, error, 'reactionRoleRemove');
  }
}
