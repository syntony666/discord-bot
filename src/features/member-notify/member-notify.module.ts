import { PrismaClient, MemberNotifyConfig } from '@prisma-client/client';
import { from, Observable } from 'rxjs';

export interface CreateMemberNotifyConfigInput {
  guildId: string;
  channelId: string;
}

export interface UpdateMemberNotifyMessageInput {
  guildId: string;
  type: 'join' | 'leave';
  message: string;
}

/**
 * Data access layer for member notification configuration.
 * All methods return Observables wrapping Prisma operations.
 */
export interface MemberNotifyModule {
  getConfig$(guildId: string): Observable<MemberNotifyConfig | null>;
  createOrUpdateConfig$(input: CreateMemberNotifyConfigInput): Observable<MemberNotifyConfig>;
  updateMessage$(input: UpdateMemberNotifyMessageInput): Observable<MemberNotifyConfig>;
  toggleEnabled$(guildId: string, enabled: boolean): Observable<MemberNotifyConfig>;
  toggleJoinEnabled$(guildId: string, enabled: boolean): Observable<MemberNotifyConfig>;
  toggleLeaveEnabled$(guildId: string, enabled: boolean): Observable<MemberNotifyConfig>;
  deleteConfig$(guildId: string): Observable<void>;
}

export function createMemberNotifyModule(prisma: PrismaClient): MemberNotifyModule {
  return {
    getConfig$(guildId: string) {
      return from(
        prisma.memberNotifyConfig.findUnique({
          where: { guildId },
        })
      );
    },

    createOrUpdateConfig$(input: CreateMemberNotifyConfigInput) {
      return from(
        prisma.memberNotifyConfig.upsert({
          where: { guildId: input.guildId },
          update: {
            channelId: input.channelId,
            enabled: true,
          },
          create: {
            guildId: input.guildId,
            channelId: input.channelId,
            enabled: true,
          },
        })
      );
    },

    updateMessage$(input: UpdateMemberNotifyMessageInput) {
      const updateData =
        input.type === 'join' ? { joinMessage: input.message } : { leaveMessage: input.message };

      return from(
        prisma.memberNotifyConfig.update({
          where: { guildId: input.guildId },
          data: updateData,
        })
      );
    },

    toggleEnabled$(guildId: string, enabled: boolean) {
      return from(
        prisma.memberNotifyConfig.update({
          where: { guildId },
          data: { enabled },
        })
      );
    },

    toggleJoinEnabled$(guildId: string, enabled: boolean) {
      return from(
        prisma.memberNotifyConfig.update({
          where: { guildId },
          data: { joinEnabled: enabled },
        })
      );
    },

    toggleLeaveEnabled$(guildId: string, enabled: boolean) {
      return from(
        prisma.memberNotifyConfig.update({
          where: { guildId },
          data: { leaveEnabled: enabled },
        })
      );
    },

    deleteConfig$(guildId: string) {
      return from(prisma.memberNotifyConfig.delete({ where: { guildId } }).then(() => undefined));
    },
  };
}
