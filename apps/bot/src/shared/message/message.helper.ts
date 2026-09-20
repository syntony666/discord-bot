import { MessageFactory } from './message.factory';
import type { DiscordActions } from '@core/discord/discord-actions';
import { MessageType } from './message.types';
import type { MessageOptions } from './message.types';
import type { APIEmbed } from 'discord-api-types/v10';
import type { MessageComponents } from '@core/discord/discord.types';
import type { BotInteraction } from '@core/rx/bus';

export { MessageType } from './message.types';

export async function sendMessage(options: MessageOptions): Promise<boolean> {
  const strategy = MessageFactory.createStrategy(options);
  return strategy.send();
}

// ==================== Reply convenience functions ====================

export async function replySuccess(
  actions: DiscordActions,
  interaction: BotInteraction,
  options: Omit<APIEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.SUCCESS_REPLY,
    actions,
    interaction,
    ...options,
  });
}

export async function replyError(
  actions: DiscordActions,
  interaction: BotInteraction,
  options: Omit<APIEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.ERROR_REPLY,
    actions,
    interaction,
    ...options,
  });
}

export async function replyInfo(
  actions: DiscordActions,
  interaction: BotInteraction,
  options: Omit<APIEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.INFO_REPLY,
    actions,
    interaction,
    ...options,
  });
}

export async function replyWarning(
  actions: DiscordActions,
  interaction: BotInteraction,
  options: Omit<APIEmbed, 'type'> & {
    ephemeral?: boolean;
    components?: MessageComponents;
    isEdit?: boolean;
  }
): Promise<boolean> {
  return sendMessage({
    type: MessageType.WARNING_REPLY,
    actions,
    interaction,
    ...options,
  });
}

export async function replyAutoError(
  actions: DiscordActions,
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
    actions,
    interaction,
    error,
    customMessages,
  });
}

// ==================== Notification unified interface ====================

export interface NotifyOptions extends Omit<APIEmbed, 'type'> {
  type: 'stream_live' | 'member_join' | 'member_leave' | 'announcement' | 'custom';
}

export async function notify(
  actions: DiscordActions,
  channelId: bigint | string,
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
    actions,
    channelId,
    ...embedOptions,
  });
}
