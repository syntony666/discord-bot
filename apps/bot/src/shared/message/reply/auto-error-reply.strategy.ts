import { ApiError } from '@discord-bot/shared';
import { DiscordApiErrorCodes } from '@core/errors/discord-error-codes';
import { ReplyStrategy } from './reply.strategy';
import { Colors } from '@core/config';
import type { MessageStrategy, AutoErrorReplyOptions } from '../message.types';

export class AutoErrorReplyStrategy implements MessageStrategy {
  constructor(private readonly options: AutoErrorReplyOptions) {}

  async send(): Promise<boolean> {
    const { actions, interaction, error, customMessages } = this.options;
    const description = this.parseErrorMessage(error, customMessages);

    const replyStrategy = new ReplyStrategy({
      actions,
      interaction,
      title: '❌ 錯誤',
      description,
      color: Colors.ERROR,
      ephemeral: false,
    });

    return replyStrategy.send();
  }

  private parseErrorMessage(
    error: any,
    customMessages?: AutoErrorReplyOptions['customMessages']
  ): string {
    if (error instanceof ApiError) {
      if (error.code === 'CONFLICT') return customMessages?.duplicate || '此項目已存在。';
      if (error.code === 'NOT_FOUND') return customMessages?.notFound || '找不到指定的項目。';
      return 'API 服務發生問題，請稍後再試。';
    }
    if (error instanceof TypeError && String(error.message).includes('fetch')) {
      return 'API 服務連線發生問題，請稍後再試。';
    }

    if (
      error.code === DiscordApiErrorCodes.MISSING_PERMISSIONS ||
      error.code === DiscordApiErrorCodes.MISSING_ACCESS
    ) {
      return customMessages?.permission || '機器人沒有執行此操作的權限，請檢查機器人的權限設定。';
    }

    return customMessages?.generic || '發生未知錯誤，請稍後再試。';
  }
}
