import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { lastValueFrom } from 'rxjs';
import { replySuccess, replyError } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { roleMention } from 'shared/utils/discord.utils';
import { buildPanelEmbed } from '../reaction-role.helpers';
import {
  formatEmojiForDisplay,
  formatEmojiForReaction,
  normalizeEmojiForStorage,
} from '../reaction-role.helpers';
import type { PanelMode } from '../reaction-role.types';
import { addDiscordReaction, updatePanelMessage } from '../internal/operations';

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
    log.error({ error, guildId, panelId }, 'Failed to add reaction role');
    await handleError(bot, interaction, error, 'reactionRoleAdd');
  }
}
