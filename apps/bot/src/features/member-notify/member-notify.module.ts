import { PrismaClient, NotificationType } from '@prisma-client/client';
import { from, Observable } from 'rxjs';
import { NotificationChannel, MemberNotifyMessage } from './member-notify.select';

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

export function createMemberNotifyModule(prisma: PrismaClient): MemberNotifyModule {
  return {
    // ========== NotificationChannel Operations ==========

    getNotificationChannel$(
      guildId: string,
      type: NotificationType
    ): Observable<NotificationChannel | null> {
      return from(
        prisma.notificationChannel.findUnique({
          where: {
            guildId_type: { guildId, type },
          },
        })
      );
    },

    setNotificationChannel$(
      input: CreateNotificationChannelInput
    ): Observable<NotificationChannel> {
      return from(
        prisma.notificationChannel.upsert({
          where: {
            guildId_type: { guildId: input.guildId, type: input.type },
          },
          update: {
            channelId: input.channelId,
            enabled: true,
          },
          create: {
            guildId: input.guildId,
            type: input.type,
            channelId: input.channelId,
            enabled: true,
          },
        })
      );
    },

    toggleChannelEnabled$(
      guildId: string,
      type: NotificationType,
      enabled: boolean
    ): Observable<NotificationChannel> {
      return from(
        prisma.notificationChannel.update({
          where: {
            guildId_type: { guildId, type },
          },
          data: { enabled },
        })
      );
    },

    deleteNotificationChannel$(guildId: string, type: NotificationType): Observable<void> {
      return from(
        prisma.notificationChannel
          .delete({
            where: {
              guildId_type: { guildId, type },
            },
          })
          .then(() => undefined)
      );
    },

    getNotificationChannels$(guildId: string): Observable<NotificationChannel[]> {
      return from(
        prisma.notificationChannel.findMany({
          where: { guildId },
          orderBy: { type: 'asc' },
        })
      );
    },

    // ========== MemberNotifyMessage Operations ==========

    getMessageTemplates$(guildId: string): Observable<MemberNotifyMessage | null> {
      return from(
        prisma.memberNotifyMessage.findUnique({
          where: { guildId },
        })
      );
    },

    upsertMessageTemplates$(input: UpsertMessageInput): Observable<MemberNotifyMessage> {
      const updateData: any = {};
      if (input.joinMessage !== undefined) updateData.joinMessage = input.joinMessage;
      if (input.leaveMessage !== undefined) updateData.leaveMessage = input.leaveMessage;

      return from(
        prisma.memberNotifyMessage.upsert({
          where: { guildId: input.guildId },
          update: updateData,
          create: {
            guildId: input.guildId,
            ...updateData,
          },
        })
      );
    },

    updateMessage$(input: UpdateMessageInput): Observable<MemberNotifyMessage> {
      const updateData =
        input.type === 'join' ? { joinMessage: input.message } : { leaveMessage: input.message };

      return from(
        prisma.memberNotifyMessage.upsert({
          where: { guildId: input.guildId },
          update: updateData,
          create: {
            guildId: input.guildId,
            ...updateData,
          },
        })
      );
    },

    deleteMessageTemplates$(guildId: string): Observable<void> {
      return from(
        prisma.memberNotifyMessage
          .delete({
            where: { guildId },
          })
          .then(() => undefined)
      );
    },
  };
}
