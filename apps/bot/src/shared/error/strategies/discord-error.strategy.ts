import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { DiscordErrorCodes, DiscordErrorMessages } from '../discord-errors';
import { BaseErrorStrategy } from './error.strategy';
import { ErrorContext } from '../error-contexts';

export class DiscordErrorStrategy extends BaseErrorStrategy {
  canHandle(error: unknown): boolean {
    return (
      error != null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'number'
    );
  }

  async handle(
    bot: Bot,
    interaction: BotInteraction,
    error: any,
    context: ErrorContext
  ): Promise<void> {
    const errorCode = error.code;

    // Handle specific Discord errors with context messages
    if (errorCode === DiscordErrorCodes.MISSING_PERMISSIONS) {
      if (context.discordMissingPermissions) {
        this.log.warn({ errorCode, contextKey: context.key }, 'Discord API: Missing permissions');
        await this.replyError(bot, interaction, context.discordMissingPermissions);
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.UNKNOWN_MESSAGE) {
      if (context.discordUnknownMessage) {
        this.log.warn({ errorCode, contextKey: context.key }, 'Discord API: Unknown message');
        await this.replyError(bot, interaction, context.discordUnknownMessage);
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.MISSING_ACCESS) {
      if (context.discordMissingAccess) {
        this.log.warn({ errorCode, contextKey: context.key }, 'Discord API: Missing access');
        await this.replyError(bot, interaction, context.discordMissingAccess);
        return;
      }
    }

    if (errorCode === DiscordErrorCodes.UNKNOWN_EMOJI) {
      if (context.discordUnknownEmoji) {
        this.log.warn({ errorCode, contextKey: context.key }, 'Discord API: Unknown emoji');
        await this.replyError(bot, interaction, context.discordUnknownEmoji);
        return;
      }
    }

    // Fallback to generic Discord error message
    const discordMessage = DiscordErrorMessages[errorCode];
    if (discordMessage) {
      this.log.warn({ errorCode, contextKey: context.key }, 'Discord API error');
      await this.replyError(bot, interaction, discordMessage);
      return;
    }
  }
}
