import { Bot } from '@discordeno/bot';
import { ReactionRolePanel, ReactionRole } from '@prisma-client/client';
import { createLogger } from '@core/logger';
import { buildPanelEmbed } from '../panel/panel.helper';
import type { PanelMode } from '../reaction-role.types';

const log = createLogger('ReactionRoleOperations');

/**
 * Delete Discord message with standardized error handling
 */
export async function deleteDiscordMessage(
  bot: Bot,
  channelId: string,
  messageId: string,
  context: { guildId: string; panelId?: string }
): Promise<void> {
  try {
    await bot.helpers.deleteMessage(BigInt(channelId), BigInt(messageId));
    log.debug({ ...context, messageId }, 'Discord message deleted');
  } catch (error: any) {
    // 10008 = Unknown Message (message already deleted)
    if (error.code === 10008) {
      log.warn({ ...context, messageId }, 'Message already deleted, continuing with cleanup');
    } else {
      throw error;
    }
  }
}

/**
 * Update panel Discord message with new content
 */
export async function updatePanelMessage(
  bot: Bot,
  panel: ReactionRolePanel,
  roles: ReactionRole[],
  updates?: {
    title?: string;
    description?: string | null;
    mode?: PanelMode;
  }
): Promise<void> {
  // Sanitize values: convert null to undefined for buildPanelEmbed
  const finalTitle = updates?.title !== undefined ? updates.title : panel.title;

  // Explicitly handle null conversion to satisfy TypeScript
  let finalDescription: string | undefined;
  if (updates?.description !== undefined) {
    finalDescription = updates.description === null ? undefined : updates.description;
  } else {
    finalDescription = panel.description === null ? undefined : panel.description;
  }

  const finalMode = updates?.mode !== undefined ? updates.mode : (panel.mode as PanelMode);

  await bot.helpers.editMessage(
    BigInt(panel.channelId),
    BigInt(panel.messageId),
    buildPanelEmbed({
      title: finalTitle,
      description: finalDescription,
      mode: finalMode,
      roles,
      messageId: panel.messageId,
    })
  );

  log.debug(
    { guildId: panel.guildId, panelId: panel.messageId, updates },
    'Discord panel message updated'
  );
}

/**
 * Delete bot's reaction from Discord message
 */
export async function deleteDiscordReaction(
  bot: Bot,
  channelId: string,
  messageId: string,
  emoji: string,
  context: { guildId: string; panelId: string }
): Promise<void> {
  try {
    await bot.helpers.deleteOwnReaction(BigInt(channelId), BigInt(messageId), emoji);
    log.debug({ ...context, emoji }, 'Discord reaction deleted');
  } catch (error: any) {
    // 10008 = Unknown Message or reaction doesn't exist
    if (error.code !== 10008) {
      throw error;
    }
    log.warn({ ...context, emoji }, 'Reaction already removed, continuing');
  }
}

/**
 * Add bot's reaction to Discord message
 */
export async function addDiscordReaction(
  bot: Bot,
  channelId: string,
  messageId: string,
  emoji: string,
  context: { guildId: string; panelId: string }
): Promise<void> {
  await bot.helpers.addReaction(BigInt(channelId), BigInt(messageId), emoji);
  log.debug({ ...context, emoji }, 'Discord reaction added');
}

/**
 * Sanitize updates object to convert null to undefined for database operations
 */
export function sanitizeUpdates<T extends Record<string, any>>(updates: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sanitized[key] = value === null ? undefined : value;
    }
  }

  return sanitized;
}
