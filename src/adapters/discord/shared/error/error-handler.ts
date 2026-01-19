import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { replyAutoError, replyError } from '@adapters/discord/shared/message/message.helper';
import { ErrorContexts, ErrorContextKey } from './error-contexts';
import { createLogger } from '@core/logger';
import { DiscordErrorCodes, DiscordErrorMessages } from './discord-errors';

const log = createLogger('ErrorHandler');

/**
 * Unified error handler with contextual error messages.
 *
 * This handler provides a centralized way to handle errors across all commands,
 * with support for:
 * - Prisma database errors (via replyAutoError)
 * - Discord API errors (via error code mapping)
 * - Context-specific custom messages
 *
 * @param bot Bot instance
 * @param interaction User interaction
 * @param error The caught error
 * @param contextKey Key to lookup context-specific error messages
 *
 * @example
 * ```typescript
 * try {
 *   await lastValueFrom(module.createRule$(...));
 * } catch (error) {
 *   await handleError(bot, interaction, error, 'keywordAdd');
 * }
 * ```
 */
export async function handleError(
  bot: Bot,
  interaction: BotInteraction,
  error: unknown,
  contextKey: ErrorContextKey
): Promise<void> {
  const context = ErrorContexts[contextKey];

  if (!context) {
    log.error({ contextKey, error }, 'Unknown error context key');
    await replyError(bot, interaction, {
      description: '發生未預期的錯誤，請稍後再試。',
    });
    return;
  }

  // Check if it's a Discord API error
  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = (error as any).code;

    // Use context-specific message if available
    if (errorCode === DiscordErrorCodes.MISSING_PERMISSIONS) {
      if (context.discordMissingPermissions) {
        log.warn({ errorCode, contextKey }, 'Discord API: Missing permissions');
        await replyError(bot, interaction, {
          description: context.discordMissingPermissions,
        });
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.UNKNOWN_MESSAGE) {
      if (context.discordUnknownMessage) {
        log.warn({ errorCode, contextKey }, 'Discord API: Unknown message');
        await replyError(bot, interaction, {
          description: context.discordUnknownMessage,
        });
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.MISSING_ACCESS) {
      if (context.discordMissingAccess) {
        log.warn({ errorCode, contextKey }, 'Discord API: Missing access');
        await replyError(bot, interaction, {
          description: context.discordMissingAccess,
        });
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.UNKNOWN_EMOJI) {
      if (context.discordUnknownEmoji) {
        log.warn({ errorCode, contextKey }, 'Discord API: Unknown emoji');
        await replyError(bot, interaction, {
          description: context.discordUnknownEmoji,
        });
        return;
      }
    }

    // Fallback to generic Discord error message
    const discordMessage = DiscordErrorMessages[errorCode];
    if (discordMessage) {
      log.warn({ errorCode, contextKey }, 'Discord API error');
      await replyError(bot, interaction, {
        description: discordMessage,
      });
      return;
    }
  }

  // Fallback to replyAutoError for Prisma and other errors
  const customMessages = {
    duplicate: context.duplicate,
    notFound: context.notFound,
    permission: context.discordMissingPermissions,
    generic: context.generic,
  };

  await replyAutoError(bot, interaction, error, customMessages);
}
