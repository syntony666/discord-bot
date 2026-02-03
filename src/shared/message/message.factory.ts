import { ReplyStrategy } from './reply/reply.strategy';
import { AutoErrorReplyStrategy } from './reply/auto-error-reply.strategy';
import { NotificationStrategy } from './notification/notification.strategy';
import { Colors } from '@core/config';
import type {
  MessageStrategy,
  MessageOptions,
  MessageType,
  ReplyOptions,
  NotificationOptions,
} from './message.types';

/**
 * Configuration for each message type (default title and color).
 */
const MESSAGE_CONFIG = {
  SUCCESS_REPLY: {
    defaultTitle: '✅ 成功',
    color: Colors.SUCCESS,
  },
  ERROR_REPLY: {
    defaultTitle: '❌ 錯誤',
    color: Colors.ERROR,
  },
  INFO_REPLY: {
    defaultTitle: '🔍 提示',
    color: Colors.INFO,
  },
  WARNING_REPLY: {
    defaultTitle: '⚠️ 警告',
    color: Colors.WARNING,
  },
  STREAM_LIVE_NOTIFICATION: {
    color: Colors.STREAM_LIVE,
  },
  MEMBER_JOIN_NOTIFICATION: {
    color: Colors.MEMBER_JOIN,
  },
  MEMBER_LEAVE_NOTIFICATION: {
    color: Colors.MEMBER_LEAVE,
  },
  ANNOUNCEMENT_NOTIFICATION: {
    color: Colors.ANNOUNCEMENT,
  },
} as const;

/**
 * Factory that selects the appropriate strategy based on message type.
 */
export class MessageFactory {
  /**
   * Create a strategy instance from a discriminated MessageOptions union.
   */
  static createStrategy(options: MessageOptions): MessageStrategy {
    if (options.type === 'AUTO_ERROR_REPLY') {
      return new AutoErrorReplyStrategy(options);
    }

    if (this.isReplyType(options.type)) {
      const replyOptions = options as ReplyOptions;
      const config = MESSAGE_CONFIG[replyOptions.type];
      const { type, bot, interaction, ephemeral, components, isEdit, ...embedProps } = replyOptions;

      return new ReplyStrategy({
        bot,
        interaction,
        ...embedProps,
        title: embedProps.title ?? config.defaultTitle,
        color: config.color,
        ephemeral: ephemeral ?? false,
        components,
        isEdit: isEdit ?? false,
      });
    }

    if (this.isNotificationType(options.type)) {
      const notificationOptions = options as NotificationOptions;
      const { type, bot, channelId, ...embedProps } = notificationOptions;

      const color =
        type === 'CUSTOM_NOTIFICATION'
          ? (embedProps.color ?? Colors.INFO)
          : MESSAGE_CONFIG[type].color;

      return new NotificationStrategy({
        bot,
        channelId,
        ...embedProps,
        color,
      });
    }

    throw new Error(`Unknown message type: ${(options as any).type}`);
  }

  /**
   * Narrow MessageType into reply-only types.
   */
  private static isReplyType(type: MessageType): type is ReplyOptions['type'] {
    return ['SUCCESS_REPLY', 'ERROR_REPLY', 'INFO_REPLY', 'WARNING_REPLY'].includes(type);
  }

  /**
   * Narrow MessageType into notification-only types.
   */
  private static isNotificationType(type: MessageType): type is NotificationOptions['type'] {
    return [
      'STREAM_LIVE_NOTIFICATION',
      'MEMBER_JOIN_NOTIFICATION',
      'MEMBER_LEAVE_NOTIFICATION',
      'ANNOUNCEMENT_NOTIFICATION',
      'CUSTOM_NOTIFICATION',
    ].includes(type);
  }
}
