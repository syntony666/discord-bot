import type { Bot, DiscordEmbed, MessageComponents } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

/**
 * All supported message types.
 * Used to route to different strategies.
 */
export enum MessageType {
  // Reply types (command responses)
  SUCCESS_REPLY = 'SUCCESS_REPLY',
  ERROR_REPLY = 'ERROR_REPLY',
  INFO_REPLY = 'INFO_REPLY',
  WARNING_REPLY = 'WARNING_REPLY',
  AUTO_ERROR_REPLY = 'AUTO_ERROR_REPLY',

  // Notification types
  STREAM_LIVE_NOTIFICATION = 'STREAM_LIVE_NOTIFICATION',
  MEMBER_JOIN_NOTIFICATION = 'MEMBER_JOIN_NOTIFICATION',
  MEMBER_LEAVE_NOTIFICATION = 'MEMBER_LEAVE_NOTIFICATION',
  ANNOUNCEMENT_NOTIFICATION = 'ANNOUNCEMENT_NOTIFICATION',
  CUSTOM_NOTIFICATION = 'CUSTOM_NOTIFICATION',
}

/**
 * Strategy interface implemented by all message handlers.
 */
export interface MessageStrategy {
  send(): Promise<boolean>;
}

/**
 * Options for interaction replies (slash commands, buttons, etc.).
 */
export interface ReplyOptions extends Omit<DiscordEmbed, 'type'> {
  type:
    | MessageType.SUCCESS_REPLY
    | MessageType.ERROR_REPLY
    | MessageType.INFO_REPLY
    | MessageType.WARNING_REPLY;
  bot: Bot;
  interaction: BotInteraction;
  ephemeral?: boolean;
  components?: MessageComponents;
  isEdit?: boolean;
}

/**
 * Options for automatic error reply handling.
 */
export interface AutoErrorReplyOptions {
  type: MessageType.AUTO_ERROR_REPLY;
  bot: Bot;
  interaction: BotInteraction;
  error: any;
  customMessages?: {
    duplicate?: string;
    notFound?: string;
    permission?: string;
    generic?: string;
  };
}

/**
 * Options for channel notifications (non-interaction messages).
 */
export interface NotificationOptions extends Omit<DiscordEmbed, 'type'> {
  type:
    | MessageType.STREAM_LIVE_NOTIFICATION
    | MessageType.MEMBER_JOIN_NOTIFICATION
    | MessageType.MEMBER_LEAVE_NOTIFICATION
    | MessageType.ANNOUNCEMENT_NOTIFICATION
    | MessageType.CUSTOM_NOTIFICATION;
  bot: Bot;
  channelId: bigint;
}

/**
 * Discriminated union of all message options.
 */
export type MessageOptions = ReplyOptions | AutoErrorReplyOptions | NotificationOptions;

export interface ReplyStrategyOptions extends Omit<DiscordEmbed, 'type'> {
  bot: Bot;
  interaction: BotInteraction;
  color: number;
  ephemeral?: boolean;
  isEdit?: boolean;
  components?: MessageComponents;
}

export interface NotificationStrategyOptions extends Omit<DiscordEmbed, 'type'> {
  bot: Bot;
  channelId: bigint;
  color: number;
}
