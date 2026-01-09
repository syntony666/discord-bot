import { MessageFactory } from './message.factory';
import { MessageType } from './message.types';
import type { MessageOptions, NotificationOptions } from './message.types';
import type { Bot, DiscordEmbed } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

export { MessageType } from './message.types';
export { PrismaErrorCode } from './reply/auto-error-reply.strategy';

/**
 * Low-level entry point for all message sending.
 * Prefer using the convenience helpers below.
 */
export async function sendMessage(options: MessageOptions): Promise<boolean> {
  const strategy = MessageFactory.createStrategy(options);
  return strategy.send();
}

// ==================== Reply convenience functions ====================

/**
 * Reply with a success-style embed.
 */
export async function replySuccess(
  bot: Bot,
  interaction: BotInteraction,
  options: { title?: string; description: string; ephemeral?: boolean }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.SUCCESS_REPLY,
    bot,
    interaction,
    ...options,
  });
}

/**
 * Reply with an error-style embed.
 */
export async function replyError(
  bot: Bot,
  interaction: BotInteraction,
  options: { title?: string; description: string; ephemeral?: boolean }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.ERROR_REPLY,
    bot,
    interaction,
    ...options,
  });
}

/**
 * Reply with an info-style embed.
 */
export async function replyInfo(
  bot: Bot,
  interaction: BotInteraction,
  options: { title?: string; description: string; ephemeral?: boolean }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.INFO_REPLY,
    bot,
    interaction,
    ...options,
  });
}

/**
 * Reply with a warning-style embed.
 */
export async function replyWarning(
  bot: Bot,
  interaction: BotInteraction,
  options: { title?: string; description: string; ephemeral?: boolean }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.WARNING_REPLY,
    bot,
    interaction,
    ...options,
  });
}

/**
 * Reply with an automatically parsed error message.
 */
export async function replyAutoError(
  bot: Bot,
  interaction: BotInteraction,
  error: any,
  customMessages?: {
    duplicate?: string;
    notFound?: string;
    permission?: string;
    generic?: string;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.AUTO_ERROR_REPLY,
    bot,
    interaction,
    error,
    customMessages,
  });
}

// ==================== Notification unified interface ====================

/**
 * High-level options for channel notifications.
 */
export interface NotifyOptions {
  type: 'stream_live' | 'member_join' | 'member_leave' | 'announcement' | 'custom';
  title: string;
  description: string;
  color?: number;
  fields?: DiscordEmbed['fields'];
  thumbnail?: string;
  image?: string;
  footer?: DiscordEmbed['footer'];
}

/**
 * Send a notification to a channel using a semantic type.
 */
export async function notify(
  bot: Bot,
  channelId: bigint,
  options: NotifyOptions
): Promise<boolean> {
  const typeMap = {
    stream_live: MessageType.STREAM_LIVE_NOTIFICATION,
    member_join: MessageType.MEMBER_JOIN_NOTIFICATION,
    member_leave: MessageType.MEMBER_LEAVE_NOTIFICATION,
    announcement: MessageType.ANNOUNCEMENT_NOTIFICATION,
    custom: MessageType.CUSTOM_NOTIFICATION,
  } as const;

  const messageType = typeMap[options.type];

  const notificationOptions: NotificationOptions = {
    type: messageType,
    bot,
    channelId,
    title: options.title,
    description: options.description,
    color: options.color,
    fields: options.fields,
    thumbnail: options.thumbnail,
    image: options.image,
    footer: options.footer,
  };

  return sendMessage(notificationOptions);
}
