import { MessageFactory } from './message.factory';
import { MessageType } from './message.types';
import type { MessageOptions } from './message.types';
import type { Bot, DiscordEmbed, MessageComponents } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

export { MessageType } from './message.types';

export async function sendMessage(options: MessageOptions): Promise<boolean> {
  const strategy = MessageFactory.createStrategy(options);
  return strategy.send();
}

// ==================== Reply convenience functions ====================

export async function replySuccess(
  bot: Bot,
  interaction: BotInteraction,
  options: Omit<DiscordEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.SUCCESS_REPLY,
    bot,
    interaction,
    ...options,
  });
}

export async function replyError(
  bot: Bot,
  interaction: BotInteraction,
  options: Omit<DiscordEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.ERROR_REPLY,
    bot,
    interaction,
    ...options,
  });
}

export async function replyInfo(
  bot: Bot,
  interaction: BotInteraction,
  options: Omit<DiscordEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.INFO_REPLY,
    bot,
    interaction,
    ...options,
  });
}

export async function replyWarning(
  bot: Bot,
  interaction: BotInteraction,
  options: Omit<DiscordEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.WARNING_REPLY,
    bot,
    interaction,
    ...options,
  });
}

export async function replyAutoError(
  bot: Bot,
  interaction: BotInteraction,
  error: Error | { code?: number | string; message?: string },
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

export interface NotifyOptions extends Omit<DiscordEmbed, 'type'> {
  type: 'stream_live' | 'member_join' | 'member_leave' | 'announcement' | 'custom';
}

export async function notify(
  bot: Bot,
  channelId: bigint,
  { type, ...embedOptions }: NotifyOptions
): Promise<boolean> {
  const typeMap = {
    stream_live: MessageType.STREAM_LIVE_NOTIFICATION,
    member_join: MessageType.MEMBER_JOIN_NOTIFICATION,
    member_leave: MessageType.MEMBER_LEAVE_NOTIFICATION,
    announcement: MessageType.ANNOUNCEMENT_NOTIFICATION,
    custom: MessageType.CUSTOM_NOTIFICATION,
  } as const;

  return sendMessage({
    type: typeMap[type],
    bot,
    channelId,
    ...embedOptions,
  });
}
