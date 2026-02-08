import { PrismaClient } from '@prisma-client/client';
import { Observable, from } from 'rxjs';
import { GuildData } from './guild.types';

export interface GuildModule {
  ensureGuild$(guildId: string, guildName?: string): Observable<GuildData>;
  getGuild$(guildId: string): Observable<GuildData | null>;
  deleteGuild$(guildId: string): Observable<void>;
  listGuilds$(): Observable<GuildData[]>;
}

export function createGuildModule(prisma: PrismaClient): GuildModule {
  return {
    ensureGuild$(guildId: string, guildName?: string): Observable<GuildData> {
      return from(
        prisma.guild.upsert({
          where: { id: guildId },
          update: {
            // Only update name if provided and different
            ...(guildName && { name: guildName }),
          },
          create: {
            id: guildId,
            name: guildName || `Guild ${guildId}`,
          },
        })
      );
    },

    getGuild$(guildId: string): Observable<GuildData | null> {
      return from(
        prisma.guild.findUnique({
          where: { id: guildId },
        })
      );
    },

    deleteGuild$(guildId: string): Observable<void> {
      return from(
        prisma.guild
          .delete({
            where: { id: guildId },
          })
          .then(() => undefined)
      );
    },

    listGuilds$(): Observable<GuildData[]> {
      return from(
        prisma.guild.findMany({
          orderBy: { createdAt: 'desc' },
        })
      );
    },
  };
}
