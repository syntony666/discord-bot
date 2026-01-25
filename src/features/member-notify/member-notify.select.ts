// src/features/member-notify/member-notify.select.ts

import { Prisma, NotificationChannel, MemberNotifyMessage } from '@prisma-client/client';

/**
 * Runtime selector for member notification processing.
 *
 * Purpose: High-frequency member join/leave event handling
 * Usage: guildMemberAdd/Remove event handlers
 * Optimization: Combines Guild + NotificationChannel + MemberNotifyMessage in single query
 * Performance gain: Reduces 3 queries to 1, excludes unnecessary timestamps
 */
export const memberNotifyRuntimeSelect = {
  id: true,
  name: true,
  approximateMemberCount: true,
  notificationChannels: {
    select: {
      type: true,
      channelId: true,
      enabled: true,
    },
  },
  memberNotifyMessage: {
    select: {
      joinMessage: true,
      leaveMessage: true,
    },
  },
} as const satisfies Prisma.GuildSelect;

/**
 * Runtime type for member notification processing.
 * Use this for high-frequency member event handling.
 * For admin operations, use NotificationChannel and MemberNotifyMessage (full models).
 */
export type MemberNotifyRuntime = Prisma.GuildGetPayload<{
  select: typeof memberNotifyRuntimeSelect;
}>;

/**
 * Full types for admin operations.
 * Use these for CRUD operations and configuration views.
 */
export type { NotificationChannel, MemberNotifyMessage };
