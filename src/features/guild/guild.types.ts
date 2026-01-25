/**
 * Type definitions for Guild feature
 */

export interface GuildFeatureContext {
  ready: boolean;
  guildCount: number;
  lastSyncAt: Date;
}

export interface GuildSyncResult {
  guildId: string;
  synced: boolean;
  message?: string;
}
