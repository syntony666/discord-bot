import { ReplyStrategy } from './reply/reply.strategy';
import { AutoErrorReplyStrategy } from './reply/auto-error-reply.strategy';
import { NotificationStrategy } from './notification/notification.strategy';
import { Colors } from '@core/config/colors.config';
import type {
  MessageStrategy,
  MessageOptions,
  MessageType,
  ReplyOptions,
  NotificationOptions,
} from './message.types';

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
  AUTO_ERROR_REPLY: {
    defaultTitle: '❌ 錯誤',
    color: Colors.ERROR,
  },
  STREAM_LIVE_NOTIFICATION: {
    defaultTitle: '🔴 直播開始',
    color: Colors.STREAM_LIVE,
  },
  MEMBER_JOIN_NOTIFICATION: {
    defaultTitle: '👋 成員加入',
    color: Colors.MEMBER_JOIN,
  },
  MEMBER_LEAVE_NOTIFICATION: {
    defaultTitle: '👋 成員離開',
    color: Colors.MEMBER_LEAVE,
  },
  ANNOUNCEMENT_NOTIFICATION: {
    defaultTitle: '📢 公告',
    color: Colors.ANNOUNCEMENT,
  },
  CUSTOM_NOTIFICATION: {
    defaultTitle: '📢 通知',
    color: Colors.ANNOUNCEMENT,
  },
} as const;

export class MessageFactory {
  static createStrategy(options: MessageOptions): MessageStrategy {
    const type = options.type as MessageType;

    // Handle reply types
    if (this.isReplyType(type)) {
      const replyOptions = options as any;
      const config = MESSAGE_CONFIG[type];
      const {
        type: _,
        bot,
        interaction,
        ephemeral,
        components,
        isEdit,
        ...embedProps
      } = replyOptions;

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

    // Handle notification types
    if (this.isNotificationType(type)) {
      const notificationOptions = options as any;
      const { type: _, bot, channelId, ...embedProps } = notificationOptions;

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

    // Handle auto error reply
    if (type === 'AUTO_ERROR_REPLY') {
      const autoErrorOptions = options as any;
      const config = MESSAGE_CONFIG.AUTO_ERROR_REPLY;
      const { type: _, bot, interaction, error, customMessages, ...embedProps } = autoErrorOptions;

      return new AutoErrorReplyStrategy({
        bot,
        interaction,
        error,
        customMessages,
        ...embedProps,
        title: embedProps.title ?? config.defaultTitle,
        color: config.color,
      });
    }

    throw new Error(`Unknown message type: ${type}`);
  }

  private static isReplyType(type: MessageType): boolean {
    return ['SUCCESS_REPLY', 'ERROR_REPLY', 'INFO_REPLY', 'WARNING_REPLY'].includes(type);
  }

  private static isNotificationType(type: MessageType): boolean {
    return [
      'STREAM_LIVE_NOTIFICATION',
      'MEMBER_JOIN_NOTIFICATION',
      'MEMBER_LEAVE_NOTIFICATION',
      'ANNOUNCEMENT_NOTIFICATION',
      'CUSTOM_NOTIFICATION',
    ].includes(type);
  }
}
