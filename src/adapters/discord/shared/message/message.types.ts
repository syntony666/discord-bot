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
 * Common properties for embed-based messages.
 */
interface BaseMessageOptions {
  title?: string;
  description: string;
  fields?: DiscordEmbed['fields'];
  thumbnail?: string;
  image?: string;
  footer?: DiscordEmbed['footer'];
}

/**
 * Options for interaction replies (slash commands, buttons, etc.).
 */
export interface ReplyOptions extends BaseMessageOptions {
  type:
    | MessageType.SUCCESS_REPLY
    | MessageType.ERROR_REPLY
    | MessageType.INFO_REPLY
    | MessageType.WARNING_REPLY;
  bot: Bot;
  interaction: BotInteraction;
  ephemeral?: boolean;
  fields?: DiscordEmbed['fields'];
  components?: MessageComponents;
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
export interface NotificationOptions extends BaseMessageOptions {
  type:
    | MessageType.STREAM_LIVE_NOTIFICATION
    | MessageType.MEMBER_JOIN_NOTIFICATION
    | MessageType.MEMBER_LEAVE_NOTIFICATION
    | MessageType.ANNOUNCEMENT_NOTIFICATION
    | MessageType.CUSTOM_NOTIFICATION;
  bot: Bot;
  channelId: bigint;
  color?: number;
}

/**
 * Discriminated union of all message options.
 */
export type MessageOptions = ReplyOptions | AutoErrorReplyOptions | NotificationOptions;

export interface ReplyStrategyOptions {
  bot: Bot;
  interaction: BotInteraction;
  title?: string;
  description: string;
  color: number;
  ephemeral?: boolean;
  fields?: DiscordEmbed['fields'];
  components?: MessageComponents;
}

export interface NotificationStrategyOptions {
  bot: Bot;
  channelId: bigint;
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbed['fields'];
  thumbnail?: string;
  image?: string;
  footer?: DiscordEmbed['footer'];
}
