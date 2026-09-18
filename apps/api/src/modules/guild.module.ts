import { PrismaClient } from '../.prisma/client';

export function createGuildModule(prisma: PrismaClient) {
  return {
    ensureGuild(guildId: string, guildName?: string) {
      return prisma.guild.upsert({
        where: { id: guildId },
        update: {
          ...(guildName && { name: guildName }),
        },
        create: {
          id: guildId,
          name: guildName || `Guild ${guildId}`,
        },
      });
    },

    getGuild(guildId: string) {
      return prisma.guild.findUnique({ where: { id: guildId } });
    },

    async deleteGuild(guildId: string) {
      await prisma.guild.delete({ where: { id: guildId } });
    },

    listGuilds() {
      return prisma.guild.findMany({ orderBy: { createdAt: 'desc' } });
    },
  };
}

export type GuildModule = ReturnType<typeof createGuildModule>;
