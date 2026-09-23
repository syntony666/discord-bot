import { PrismaClient } from '../.prisma/client';
import type {
  CreateReactionRoleInput,
  CreateReactionRolePanelInput,
  UpdateReactionRolePanelInput,
} from '@discord-bot/shared';

export function createReactionRoleModule(prisma: PrismaClient) {
  return {
    getPanel(guildId: string, messageId: string) {
      return prisma.reactionRolePanel.findUnique({
        where: { guildId_messageId: { guildId, messageId } },
      });
    },

    getPanelsByGuild(guildId: string) {
      return prisma.reactionRolePanel.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
      });
    },

    createPanel(input: CreateReactionRolePanelInput) {
      return prisma.reactionRolePanel.create({
        data: {
          guildId: input.guildId,
          messageId: input.messageId,
          channelId: input.channelId,
          title: input.title || '選擇你的身分組',
          description: input.description,
          mode: input.mode || 'NORMAL',
        },
      });
    },

    updatePanel(guildId: string, messageId: string, updates: UpdateReactionRolePanelInput) {
      return prisma.reactionRolePanel.update({
        where: { guildId_messageId: { guildId, messageId } },
        data: updates,
      });
    },

    async deletePanel(guildId: string, messageId: string) {
      await prisma.$transaction([
        prisma.reactionRole.deleteMany({ where: { guildId, messageId } }),
        prisma.reactionRolePanel.delete({
          where: { guildId_messageId: { guildId, messageId } },
        }),
      ]);
    },

    getReactionRole(guildId: string, messageId: string, emoji: string) {
      return prisma.reactionRole.findUnique({
        where: { guildId_messageId_emoji: { guildId, messageId, emoji } },
      });
    },

    getReactionRolesByMessage(guildId: string, messageId: string) {
      return prisma.reactionRole.findMany({
        where: { guildId, messageId },
        orderBy: { emoji: 'asc' },
      });
    },

    createReactionRole(input: CreateReactionRoleInput) {
      return prisma.reactionRole.create({ data: input });
    },

    async deleteReactionRole(guildId: string, messageId: string, emoji: string) {
      await prisma.reactionRole.delete({
        where: { guildId_messageId_emoji: { guildId, messageId, emoji } },
      });
    },
  };
}

export type ReactionRoleModule = ReturnType<typeof createReactionRoleModule>;
