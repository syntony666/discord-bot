import {
  CreateNotificationChannelInput,
  MemberNotifyMessage,
  NotificationChannel,
  NotificationType,
  UpdateMessageInput,
  UpsertMessageInput,
} from '@discord-bot/shared';

export type { CreateNotificationChannelInput, UpdateMessageInput, UpsertMessageInput };

export interface MemberNotifyModule {
  // ========== NotificationChannel Operations ==========

  getNotificationChannel(
    guildId: string,
    type: NotificationType
  ): Promise<NotificationChannel | null>;

  setNotificationChannel(input: CreateNotificationChannelInput): Promise<NotificationChannel>;

  toggleChannelEnabled(
    guildId: string,
    type: NotificationType,
    enabled: boolean
  ): Promise<NotificationChannel>;

  deleteNotificationChannel(guildId: string, type: NotificationType): Promise<void>;

  getNotificationChannels(guildId: string): Promise<NotificationChannel[]>;

  // ========== MemberNotifyMessage Operations ==========

  getMessageTemplates(guildId: string): Promise<MemberNotifyMessage | null>;

  upsertMessageTemplates(input: UpsertMessageInput): Promise<MemberNotifyMessage>;

  updateMessage(input: UpdateMessageInput): Promise<MemberNotifyMessage>;

  deleteMessageTemplates(guildId: string): Promise<void>;
}
