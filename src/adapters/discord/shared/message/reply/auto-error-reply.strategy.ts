import { ReplyStrategy } from './reply.strategy';
import { Colors } from '@core/config';
import type { MessageStrategy, AutoErrorReplyOptions } from '../message.types';

/**
 * Prisma error codes used by auto error handling.
 */
export enum PrismaErrorCode {
  UniqueConstraintViolation = 'P2002',
  RecordNotFound = 'P2025',
  ForeignKeyConstraintViolation = 'P2003',
  RelationViolation = 'P2014',
  ConnectionError = 'P1001',
  Timeout = 'P1008',
}

/**
 * Strategy that maps known errors to user-friendly messages in Chinese.
 */
export class AutoErrorReplyStrategy implements MessageStrategy {
  constructor(private readonly options: AutoErrorReplyOptions) {}

  async send(): Promise<boolean> {
    const { bot, interaction, error, customMessages } = this.options;
    const description = this.parseErrorMessage(error, customMessages);

    const replyStrategy = new ReplyStrategy({
      bot,
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
    if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
      return customMessages?.duplicate || '此項目已存在。';
    }
    if (error.code === PrismaErrorCode.RecordNotFound) {
      return customMessages?.notFound || '找不到指定的項目。';
    }
    if (error.code === PrismaErrorCode.ConnectionError || error.code === PrismaErrorCode.Timeout) {
      return '資料庫連線發生問題，請稍後再試。';
    }

    if (error.code === 50013 || error.code === 50001) {
      return customMessages?.permission || '機器人沒有執行此操作的權限，請檢查機器人的權限設定。';
    }

    return customMessages?.generic || '發生未知錯誤，請稍後再試。';
  }
}
