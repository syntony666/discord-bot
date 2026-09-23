import { NotificationType } from './enums';

export interface NotificationChannel {
  guildId: string;
  type: NotificationType;
  channelId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberNotifyMessage {
  guildId: string;
  joinMessage: string;
  leaveMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberNotifyRuntime {
  id: string;
  name: string;
  notificationChannels: Pick<NotificationChannel, 'type' | 'channelId' | 'enabled'>[];
  memberNotifyMessage: Pick<MemberNotifyMessage, 'joinMessage' | 'leaveMessage'> | null;
}

export interface CreateNotificationChannelInput {
  guildId: string;
  type: NotificationType;
  channelId: string;
}

export interface UpsertMessageInput {
  guildId: string;
  joinMessage?: string;
  leaveMessage?: string;
}

export interface UpdateMessageInput {
  guildId: string;
  type: 'join' | 'leave';
  message: string;
}
