import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyError,
  replyInfo,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from '@adapters/discord/shared/error';
import { roleMention } from '@adapters/discord/shared/utils/discord.utils';
import { buildPanelEmbed } from '../panel/panel.helper';
import {
  formatEmojiForDisplay,
  formatEmojiForReaction,
  normalizeEmojiForStorage,
} from './role.helper';
import type { PanelMode } from '../reaction-role.types';
import { CustomIdPrefixes } from '@core/config/constants';
import {
  addDiscordReaction,
  deleteDiscordReaction,
  updatePanelMessage,
} from '../shared/operations';
import { createStandardConfirmation } from '../shared/confirmations';
import { ReactionRoleRemoveData } from './role.types';

const log = createLogger('ReactionRoleRole');

export async function handleAdd(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  service: ReactionRoleService,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;
  const emojiInput = subGroup.options?.find((o) => o.name === 'emoji')?.value as string;
  const roleId = subGroup.options?.find((o) => o.name === 'role')?.value as string;
  const description =
    (subGroup.options?.find((o) => o.name === 'description')?.value as string) || undefined;

  const emoji = normalizeEmojiForStorage(emojiInput);

  try {
    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。\n請先使用 \`/reaction-role panel create\` 建立 Panel。`,
      });
      return;
    }

    // Step 1: Add Discord reaction
    const reactionEmoji = formatEmojiForReaction(emoji);
    await addDiscordReaction(bot, panel.channelId, panelId, reactionEmoji, {
      guildId,
      panelId,
    });

    // Step 2: Update Discord message with new role
    const currentRoles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));
    const rolesWithNew = [
      ...currentRoles,
      { emoji, roleId, description: description || null, guildId, messageId: panelId },
    ];

    await bot.helpers.editMessage(
      BigInt(panel.channelId),
      BigInt(panelId),
      buildPanelEmbed({
        title: panel.title,
        description: panel.description || undefined,
        mode: panel.mode as PanelMode,
        roles: rolesWithNew,
        messageId: panelId,
      })
    );
    log.debug({ guildId, panelId }, 'Discord message updated');

    // Step 3: Create database record
    await lastValueFrom(
      module.createReactionRole$({
        guildId,
        messageId: panelId,
        emoji,
        roleId,
        description,
      })
    );
    log.debug({ guildId, panelId, emoji, roleId }, 'Database reaction role created');

    const displayEmoji = formatEmojiForDisplay(emoji);
    await replySuccess(bot, interaction, {
      title: 'Reaction Role 已添加',
      description: `${displayEmoji} → ${roleMention(roleId)} 已添加到 Panel。`,
    });

    log.info({ guildId, messageId: panelId, emoji, roleId }, 'Reaction role added successfully');
  } catch (error) {
    log.error({ error, guildId, messageId: panelId, emoji }, 'Failed to add reaction role');
    await handleError(bot, interaction, error, 'reactionRoleRoleAdd');
  }
}

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
            log.error(
              { error, guildId: data.guildId, panelId: data.panelId, emoji: data.emoji },
              'Failed to remove reaction role'
            );
            await handleError(bot, interaction, error, 'reactionRoleRoleRemove');
          }
        },
        onCancel: async (bot, interaction, data) => {
          const displayEmoji = formatEmojiForDisplay(data.emoji);
          await replyInfo(bot, interaction, {
            title: '已取消',
            description: `已取消移除 ${displayEmoji} 的綁定。`,
            isEdit: true,
          });
        },
      }
    );

    log.info({ guildId, panelId, emoji }, 'Reaction role remove confirmation requested');
  } catch (error) {
    log.error(
      { error, guildId, messageId: panelId, emoji: emojiInput },
      'Failed to prepare reaction role remove confirmation'
    );
    await handleError(bot, interaction, error, 'reactionRoleRoleRemove');
  }
}

/**
 * Handle /reaction-role list
 */
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
    await handleError(bot, interaction, error, 'reactionRoleRoleList');
  }
}
