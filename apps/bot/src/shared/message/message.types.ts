import type { APIEmbed } from 'discord-api-types/v10';
import type { MessageComponents } from '@core/discord/discord.types';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { BotInteraction } from '@core/rx/bus';

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

export interface MessageStrategy {
  send(): Promise<boolean>;
}

export interface ReplyOptions extends Omit<APIEmbed, 'type'> {
  type:
    | MessageType.SUCCESS_REPLY
    | MessageType.ERROR_REPLY
    | MessageType.INFO_REPLY
    | MessageType.WARNING_REPLY;
  actions: DiscordActions;
  interaction: BotInteraction;
  ephemeral?: boolean;
  components?: MessageComponents;
  isEdit?: boolean;
}

export interface AutoErrorReplyOptions {
  type: MessageType.AUTO_ERROR_REPLY;
  actions: DiscordActions;
  interaction: BotInteraction;
  error: Error | { code?: number | string; message?: string };
  customMessages?: {
    duplicate?: string;
    notFound?: string;
    permission?: string;
    generic?: string;
  };
}

export interface NotificationOptions extends Omit<APIEmbed, 'type'> {
  type:
    | MessageType.STREAM_LIVE_NOTIFICATION
    | MessageType.MEMBER_JOIN_NOTIFICATION
    | MessageType.MEMBER_LEAVE_NOTIFICATION
    | MessageType.ANNOUNCEMENT_NOTIFICATION
    | MessageType.CUSTOM_NOTIFICATION;
  actions: DiscordActions;
  channelId: bigint;
}

export type MessageOptions = ReplyOptions | AutoErrorReplyOptions | NotificationOptions;

export interface ReplyStrategyOptions extends Omit<APIEmbed, 'type'> {
  actions: DiscordActions;
  interaction: BotInteraction;
  color: number;
  ephemeral?: boolean;
  isEdit?: boolean;
  components?: MessageComponents;
}

export interface NotificationStrategyOptions extends Omit<APIEmbed, 'type'> {
  actions: DiscordActions;
  channelId: bigint;
  color: number;
}
