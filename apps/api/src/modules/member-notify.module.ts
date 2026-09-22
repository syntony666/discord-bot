import { PrismaClient } from '../.prisma/client';
import type {
  CreateNotificationChannelInput,
  NotificationType,
  UpdateMessageInput,
  UpsertMessageInput,
} from '@discord-bot/shared';

export function createMemberNotifyModule(prisma: PrismaClient) {
  return {
    getNotificationChannel(guildId: string, type: NotificationType) {
      return prisma.notificationChannel.findUnique({
        where: { guildId_type: { guildId, type } },
      });
    },

    setNotificationChannel(input: CreateNotificationChannelInput) {
      return prisma.notificationChannel.upsert({
        where: { guildId_type: { guildId: input.guildId, type: input.type } },
        update: { channelId: input.channelId, enabled: true },
        create: {
          guildId: input.guildId,
          type: input.type,
          channelId: input.channelId,
          enabled: true,
        },
      });
    },

    toggleChannelEnabled(guildId: string, type: NotificationType, enabled: boolean) {
      return prisma.notificationChannel.update({
        where: { guildId_type: { guildId, type } },
        data: { enabled },
      });
    },

    async deleteNotificationChannel(guildId: string, type: NotificationType) {
      await prisma.notificationChannel.delete({
        where: { guildId_type: { guildId, type } },
      });
    },

    getNotificationChannels(guildId: string) {
      return prisma.notificationChannel.findMany({
        where: { guildId },
        orderBy: { type: 'asc' },
      });
    },

    getMessageTemplates(guildId: string) {
      return prisma.memberNotifyMessage.findUnique({ where: { guildId } });
    },

    upsertMessageTemplates(input: UpsertMessageInput) {
      const data = {
        ...(input.joinMessage !== undefined && { joinMessage: input.joinMessage }),
        ...(input.leaveMessage !== undefined && { leaveMessage: input.leaveMessage }),
      };
      return prisma.memberNotifyMessage.upsert({
        where: { guildId: input.guildId },
        update: data,
        create: { guildId: input.guildId, ...data },
      });
    },

    updateMessage(input: UpdateMessageInput) {
      const data =
        input.type === 'join' ? { joinMessage: input.message } : { leaveMessage: input.message };
      return prisma.memberNotifyMessage.upsert({
        where: { guildId: input.guildId },
        update: data,
        create: { guildId: input.guildId, ...data },
      });
    },

    async deleteMessageTemplates(guildId: string) {
      await prisma.memberNotifyMessage.delete({ where: { guildId } });
    },
  };
}

export type MemberNotifyModule = ReturnType<typeof createMemberNotifyModule>;
