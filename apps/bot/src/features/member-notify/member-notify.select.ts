import { Prisma, NotificationChannel, MemberNotifyMessage } from '@prisma-client/client';

export const memberNotifyRuntimeSelect = {
  id: true,
  name: true,
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

export type MemberNotifyRuntime = Prisma.GuildGetPayload<{
  select: typeof memberNotifyRuntimeSelect;
}>;

export type { NotificationChannel, MemberNotifyMessage };
