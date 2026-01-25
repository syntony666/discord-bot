import { PrismaClient } from '@prisma-client/client';
import { Observable, from } from 'rxjs';

export interface GuildData {
  id: string;
  name: string;
  approximateMemberCount: number;
  syncedAt: Date;
}

export interface GuildModule {
  /**
   * Ensure guild exists in database.
   * Called before any other operation on a guild.
   * Creates or updates guild record if needed.
   */
  ensureGuild$(guildId: string, guildName?: string): Observable<GuildData>;

  /**
   * Get guild by ID.
   */
  getGuild$(guildId: string): Observable<GuildData | null>;

  /**
   * Update guild member count.
   */
  updateGuildMemberCount$(guildId: string, count: number): Observable<GuildData>;

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
            syncedAt: new Date(),
          },
          create: {
            id: guildId,
            name: guildName || `Guild ${guildId}`,
            approximateMemberCount: 0,
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
     * Update guild member count.
     */
    updateGuildMemberCount$(guildId: string, count: number): Observable<GuildData> {
      return from(
        prisma.guild.update({
          where: { id: guildId },
          data: {
            approximateMemberCount: count,
            syncedAt: new Date(),
          },
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
     * List all guilds.
     */
    listGuilds$(): Observable<GuildData[]> {
      return from(
        prisma.guild.findMany({
          orderBy: { syncedAt: 'desc' },
        })
      );
    },
  };
}
