import { Observable } from 'rxjs';
import { GuildData } from '@discord-bot/shared';

export interface GuildModule {
  ensureGuild$(guildId: string, guildName?: string): Observable<GuildData>;
  getGuild$(guildId: string): Observable<GuildData | null>;
  deleteGuild$(guildId: string): Observable<void>;
  listGuilds$(): Observable<GuildData[]>;
}
