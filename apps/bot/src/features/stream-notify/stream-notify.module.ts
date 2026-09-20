import { Observable } from 'rxjs';
import { StreamNotifyConfig, StreamPlatform, StreamWatcher } from '@discord-bot/shared';

export interface StreamNotifyModule {
  getConfig$(guildId: string): Observable<StreamNotifyConfig | null>;
  createConfig$(
    guildId: string,
    channelId: string,
    message?: string
  ): Observable<StreamNotifyConfig>;
  updateConfig$(guildId: string, data: Partial<StreamNotifyConfig>): Observable<StreamNotifyConfig>;
  deleteConfig$(guildId: string): Observable<void>;
  getWatchers$(guildId: string): Observable<StreamWatcher[]>;
  getAllWatchers$(): Observable<StreamWatcher[]>;
  getWatcher$(
    guildId: string,
    platform: StreamPlatform,
    platformId: string
  ): Observable<StreamWatcher | null>;
  addWatcher$(
    guildId: string,
    platform: StreamPlatform,
    platformId: string,
    displayName: string
  ): Observable<StreamWatcher>;
  removeWatcher$(guildId: string, platform: StreamPlatform, platformId: string): Observable<void>;
  updateWatcherStatus$(id: string, isLive: boolean): Observable<StreamWatcher>;
  updateWatcherUserId$(id: string, platformUserId: string): Observable<StreamWatcher>;
  updateLastChecked$(id: string): Observable<StreamWatcher>;
}
