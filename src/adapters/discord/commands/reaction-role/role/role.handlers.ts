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

const log = createLogger('ReactionRoleRole');

/**
 * Handle /reaction-role add
 */
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

    await lastValueFrom(
      module.createReactionRole$({
        guildId,
        messageId: panelId,
        emoji,
        roleId,
        description,
      })
    );

    const reactionEmoji = formatEmojiForReaction(emoji);
    await bot.helpers.addReaction(BigInt(panel.channelId), BigInt(panelId), reactionEmoji);

    const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

    await bot.helpers.editMessage(
      BigInt(panel.channelId),
      BigInt(panelId),
      buildPanelEmbed({
        title: panel.title,
        description: panel.description || undefined,
        mode: panel.mode as PanelMode,
        roles,
        messageId: panelId,
      })
    );

    const displayEmoji = formatEmojiForDisplay(emoji);
    await replySuccess(bot, interaction, {
      title: 'Reaction Role 已添加',
      description: `${displayEmoji} → ${roleMention(roleId)} 已添加到 Panel。`,
    });

    log.info({ guildId, messageId: panelId, emoji, roleId }, 'Reaction role added');
  } catch (error) {
    log.error({ error, guildId, messageId: panelId, emoji }, 'Failed to add reaction role');
    await handleError(bot, interaction, error, 'reactionRoleRoleAdd');
  }
}

/**
 * Handle /reaction-role remove
 */
export async function handleRemove(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;
  const emojiInput = subGroup.options?.find((o) => o.name === 'emoji')?.value as string;

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

    await lastValueFrom(module.deleteReactionRole$(guildId, panelId, emoji));

    if (panel) {
      try {
        const reactionEmoji = formatEmojiForReaction(emoji);
        await bot.helpers.deleteOwnReaction(
          BigInt(panel.channelId),
          BigInt(panelId),
          reactionEmoji
        );
      } catch {}

      const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

      await bot.helpers.editMessage(
        BigInt(panel.channelId),
        BigInt(panelId),
        buildPanelEmbed({
          title: panel.title,
          description: panel.description || undefined,
          mode: panel.mode as PanelMode,
          roles,
          messageId: panelId,
        })
      );
    }

    const displayEmoji = formatEmojiForDisplay(emoji);
    await replySuccess(bot, interaction, {
      title: 'Reaction Role 已移除',
      description: `${displayEmoji} 的綁定已從 Panel 中移除。`,
    });

    log.info({ guildId, messageId: panelId, emoji }, 'Reaction role removed');
  } catch (error) {
    log.error(
      { error, guildId, messageId: panelId, emoji: emojiInput },
      'Failed to remove reaction role'
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
