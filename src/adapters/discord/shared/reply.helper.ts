import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { embedReplyHelper } from './embed-reply.helper';
import { createLogger } from '@core/logger';

const log = createLogger('ReplyHelper');

interface BaseReplyOptions {
  description: string;
  ephemeral?: boolean;
}

interface SuccessReplyOptions extends BaseReplyOptions {
  title?: string;
}

interface InfoReplyOptions extends BaseReplyOptions {
  title?: string;
}

interface ErrorReplyOptions extends BaseReplyOptions {
  title?: string;
}

/**
 * 顏色常數
 */
const Colors = {
  SUCCESS: 0x9d00ff, // 紫色 #9d00ff
  ERROR: 0xe6161a, // 紅色 #e6161a
  INFO: 0xded8d0, // 灰色 #ded8d0
} as const;

/**
 * 成功回應
 * @param title - 預設為 '✅ Success'，可自訂
 */
export async function successReply(
  bot: Bot,
  interaction: BotInteraction,
  options: SuccessReplyOptions
): Promise<boolean> {
  const { title, description, ephemeral = false } = options;

  try {
    await embedReplyHelper({
      bot,
      interaction,
      title: title ?? '✅ Success',
      description,
      color: Colors.SUCCESS,
      ephemeral,
      timestamp: true,
    });
    return true;
  } catch (error) {
    log.error({ error, interactionId: interaction.id }, 'Failed to send success reply');
    return false;
  }
}

/**
 * error reply
 * @param title - default '❌ Error', customizable
 */
export async function errorReply(
  bot: Bot,
  interaction: BotInteraction,
  options: ErrorReplyOptions
): Promise<boolean> {
  const { title, description, ephemeral = false } = options;

  try {
    await embedReplyHelper({
      bot,
      interaction,
      title: title ?? '❌ Error',
      description,
      color: Colors.ERROR,
      ephemeral,
      timestamp: true,
    });
    return true;
  } catch (error) {
    log.error({ error, interactionId: interaction.id }, 'Failed to send error reply');
    return false;
  }
}

/**
 * 資訊回應
 * @param title - 預設為 'ℹ️ Information'，可自訂
 */
export async function infoReply(
  bot: Bot,
  interaction: BotInteraction,
  options: InfoReplyOptions
): Promise<boolean> {
  const { title, description, ephemeral = false } = options;

  try {
    await embedReplyHelper({
      bot,
      interaction,
      title: title ?? 'ℹ️ Information',
      description,
      color: Colors.INFO,
      ephemeral,
      timestamp: true,
    });
    return true;
  } catch (error) {
    log.error({ error, interactionId: interaction.id }, 'Failed to send info reply');
    return false;
  }
}

/**
 * Prisma error codes
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
 * 根據錯誤自動回應（智能錯誤處理）
 */
export async function autoErrorReply(
  bot: Bot,
  interaction: BotInteraction,
  error: any,
  customMessages?: {
    duplicate?: string;
    notFound?: string;
    permission?: string;
    generic?: string;
  }
): Promise<void> {
  let description = customMessages?.generic || 'An error occurred. Please try again later.';

  // 處理 Prisma 錯誤
  if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
    description = customMessages?.duplicate || 'This entry already exists.';
  } else if (error.code === PrismaErrorCode.RecordNotFound) {
    description = customMessages?.notFound || 'The requested item was not found.';
  } else if (
    error.code === PrismaErrorCode.ConnectionError ||
    error.code === PrismaErrorCode.Timeout
  ) {
    description = 'Database connection error. Please try again later.';
  }
  // 處理 Discord 錯誤
  else if (error.code === 50013 || error.code === 50001) {
    description =
      customMessages?.permission ||
      'I do not have permission to perform this action. Please check my permissions.';
  }

  await errorReply(bot, interaction, { description });
}
