import { GuildData } from '@discord-bot/shared';

export interface GuildModule {
  ensureGuild(guildId: string, guildName?: string): Promise<GuildData>;
  getGuild(guildId: string): Promise<GuildData | null>;
  deleteGuild(guildId: string): Promise<void>;
  listGuilds(): Promise<GuildData[]>;
}
