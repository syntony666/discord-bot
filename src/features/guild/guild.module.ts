import { PrismaClient } from '@prisma-client/client';
import { Observable, from } from 'rxjs';
import { GuildData } from './guild.types';

export interface GuildModule {
  /**
   * Ensure guild exists in database.
   * Creates guild record if not exists, returns existing record otherwise.
   */
  ensureGuild$(guildId: string, guildName?: string): Observable<GuildData>;

  /**
   * Get guild by ID.
   */
  getGuild$(guildId: string): Observable<GuildData | null>;

  /**
   * Delete guild and cascade all related data.
   */
  deleteGuild$(guildId: string): Observable<void>;

  /**
   * List all guilds.
   */
  listGuilds$(): Observable<GuildData[]>;
}

export function createGuildModule(prisma: PrismaClient): GuildModule {
  return {
    /**
     * Ensure guild exists.
     * If not found, create with provided name or placeholder.
     */
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

    /**
     * Get guild by ID.
     */
    getGuild$(guildId: string): Observable<GuildData | null> {
      return from(
        prisma.guild.findUnique({
          where: { id: guildId },
        })
      );
    },

    /**
     * Delete guild (cascades to all related data).
     */
    deleteGuild$(guildId: string): Observable<void> {
      return from(
        prisma.guild
          .delete({
            where: { id: guildId },
          })
          .then(() => undefined)
      );
    },

    /**
     * List all guilds ordered by creation time.
     */
    listGuilds$(): Observable<GuildData[]> {
      return from(
        prisma.guild.findMany({
          orderBy: { createdAt: 'desc' },
        })
      );
    },
  };
}
