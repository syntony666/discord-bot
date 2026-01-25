// src/features/member-notify/member-notify.module.ts

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

/**
 * Data access layer for member notifications.
 * Uses NotificationChannel + MemberNotifyMessage schema.
 * All methods return Observables wrapping Prisma operations.
 */
export interface MemberNotifyModule {
  // ========== NotificationChannel Operations ==========

  /**
   * Get notification channel for specific type (MEMBER_JOIN or MEMBER_LEAVE).
   */
  getNotificationChannel$(
    guildId: string,
    type: NotificationType
  ): Observable<NotificationChannel | null>;

  /**
   * Create or update notification channel.
   * Sets enabled to true by default.
   */
  setNotificationChannel$(input: CreateNotificationChannelInput): Observable<NotificationChannel>;

  /**
   * Toggle notification channel enabled state.
   */
  toggleChannelEnabled$(
    guildId: string,
    type: NotificationType,
    enabled: boolean
  ): Observable<NotificationChannel>;

  /**
   * Delete notification channel.
   */
  deleteNotificationChannel$(guildId: string, type: NotificationType): Observable<void>;

  /**
   * Get all notification channels for a guild.
   */
  getNotificationChannels$(guildId: string): Observable<NotificationChannel[]>;

  // ========== MemberNotifyMessage Operations ==========

  /**
   * Get message templates for a guild.
   */
  getMessageTemplates$(guildId: string): Observable<MemberNotifyMessage | null>;

  /**
   * Create or update message templates.
   * Creates with defaults if not exists.
   */
  upsertMessageTemplates$(input: UpsertMessageInput): Observable<MemberNotifyMessage>;

  /**
   * Update specific message (join or leave).
   */
  updateMessage$(input: UpdateMessageInput): Observable<MemberNotifyMessage>;

  /**
   * Delete message templates.
   */
  deleteMessageTemplates$(guildId: string): Observable<void>;
}

export function createMemberNotifyModule(prisma: PrismaClient): MemberNotifyModule {
  return {
    // ========== NotificationChannel Operations ==========

    /**
     * Get notification channel for specific type.
     */
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

    /**
     * Create or update notification channel.
     */
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

    /**
     * Toggle notification channel enabled state.
     */
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

    /**
     * Delete notification channel.
     */
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

    /**
     * Get all notification channels for a guild.
     */
    getNotificationChannels$(guildId: string): Observable<NotificationChannel[]> {
      return from(
        prisma.notificationChannel.findMany({
          where: { guildId },
          orderBy: { type: 'asc' },
        })
      );
    },

    // ========== MemberNotifyMessage Operations ==========

    /**
     * Get message templates.
     */
    getMessageTemplates$(guildId: string): Observable<MemberNotifyMessage | null> {
      return from(
        prisma.memberNotifyMessage.findUnique({
          where: { guildId },
        })
      );
    },

    /**
     * Upsert message templates (create if not exists).
     */
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

    /**
     * Update specific message template.
     */
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

    /**
     * Delete message templates.
     */
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
