import { Observable } from 'rxjs';
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

  getNotificationChannel$(
    guildId: string,
    type: NotificationType
  ): Observable<NotificationChannel | null>;

  setNotificationChannel$(input: CreateNotificationChannelInput): Observable<NotificationChannel>;

  toggleChannelEnabled$(
    guildId: string,
    type: NotificationType,
    enabled: boolean
  ): Observable<NotificationChannel>;

  deleteNotificationChannel$(guildId: string, type: NotificationType): Observable<void>;

  getNotificationChannels$(guildId: string): Observable<NotificationChannel[]>;

  // ========== MemberNotifyMessage Operations ==========

  getMessageTemplates$(guildId: string): Observable<MemberNotifyMessage | null>;

  upsertMessageTemplates$(input: UpsertMessageInput): Observable<MemberNotifyMessage>;

  updateMessage$(input: UpdateMessageInput): Observable<MemberNotifyMessage>;

  deleteMessageTemplates$(guildId: string): Observable<void>;
}
