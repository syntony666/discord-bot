import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { ErrorStrategyManager } from './error-strategy-manager';
import { ErrorContextKey } from './error-contexts';
import { createLogger } from '@core/logger';
import { replyError } from 'shared/message/message.helper';

const log = createLogger('ErrorHandler');

const errorStrategyManager = new ErrorStrategyManager();

export async function handleError(
  bot: Bot,
  interaction: BotInteraction,
  error: unknown,
  contextKey: ErrorContextKey
): Promise<void> {
  try {
    await errorStrategyManager.handleError(bot, interaction, error, contextKey);
  } catch (handlerError) {
    log.error(
      { error: handlerError, originalError: error, contextKey },
      'Error handler itself failed'
    );
    await replyError(bot, interaction, {
      title: '發生未預期的錯誤',
      description: '處理您的請求時遇到問題，請稍後再試。',
    });
  }
}
