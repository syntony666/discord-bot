import { PrismaClient, ReactionRole, ReactionRolePanel } from '@prisma-client/client';
import { from, Observable } from 'rxjs';
import { CreateReactionRoleInput } from './reaction-role.types';

/**
 * Data access layer for reaction role configuration.
 * All methods return Observables wrapping Prisma operations.
 */
export interface ReactionRoleModule {
  // Panel CRUD
  getPanel$(guildId: string, messageId: string): Observable<ReactionRolePanel | null>;
  getPanelsByGuild$(guildId: string): Observable<ReactionRolePanel[]>;
  createPanel$(input: {
    guildId: string;
    channelId: string;
    messageId: string;
    title?: string;
    description?: string;
    mode?: 'NORMAL' | 'UNIQUE' | 'VERIFY';
  }): Observable<ReactionRolePanel>;
  updatePanel$(
    guildId: string,
    messageId: string,
    updates: {
      title?: string;
      description?: string;
      mode?: 'NORMAL' | 'UNIQUE' | 'VERIFY';
    }
  ): Observable<ReactionRolePanel>;
  deletePanel$(guildId: string, messageId: string): Observable<void>;

  // Reaction Role CRUD
  getReactionRole$(
    guildId: string,
    messageId: string,
    emoji: string
  ): Observable<ReactionRole | null>;
  getReactionRolesByMessage$(guildId: string, messageId: string): Observable<ReactionRole[]>;
  createReactionRole$(input: CreateReactionRoleInput): Observable<ReactionRole>;
  deleteReactionRole$(guildId: string, messageId: string, emoji: string): Observable<void>;
}

export function createReactionRoleModule(prisma: PrismaClient): ReactionRoleModule {
  return {
    getPanel$(guildId: string, messageId: string) {
      return from(
        prisma.reactionRolePanel.findUnique({
          where: { guildId_messageId: { guildId, messageId } },
        })
      );
    },

    getPanelsByGuild$(guildId: string) {
      return from(
        prisma.reactionRolePanel.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        })
      );
    },

    createPanel$(input) {
      return from(
        prisma.reactionRolePanel.create({
          data: {
            guildId: input.guildId,
            messageId: input.messageId,
            channelId: input.channelId,
            title: input.title || '選擇你的身分組',
            description: input.description,
            mode: input.mode || 'NORMAL',
          },
        })
      );
    },

    updatePanel$(guildId: string, messageId: string, updates) {
      return from(
        prisma.reactionRolePanel.update({
          where: { guildId_messageId: { guildId, messageId } },
          data: updates,
        })
      );
    },

    deletePanel$(guildId: string, messageId: string) {
      return from(
        prisma
          .$transaction([
            prisma.reactionRole.deleteMany({ where: { guildId, messageId } }),
            prisma.reactionRolePanel.delete({
              where: { guildId_messageId: { guildId, messageId } },
            }),
          ])
          .then(() => undefined)
      );
    },

    getReactionRole$(guildId: string, messageId: string, emoji: string) {
      return from(
        prisma.reactionRole.findUnique({
          where: { guildId_messageId_emoji: { guildId, messageId, emoji } },
        })
      );
    },

    getReactionRolesByMessage$(guildId: string, messageId: string) {
      return from(
        prisma.reactionRole.findMany({
          where: { guildId, messageId },
          orderBy: { createdAt: 'asc' },
        })
      );
    },

    createReactionRole$(input: CreateReactionRoleInput) {
      return from(prisma.reactionRole.create({ data: input }));
    },

    deleteReactionRole$(guildId: string, messageId: string, emoji: string) {
      return from(
        prisma.reactionRole
          .delete({
            where: { guildId_messageId_emoji: { guildId, messageId, emoji } },
          })
          .then(() => undefined)
      );
    },
  };
}
