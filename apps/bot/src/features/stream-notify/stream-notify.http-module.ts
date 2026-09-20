import { from } from 'rxjs';
import {
  ApiRequest,
  orNull,
  StreamNotifyConfig,
  StreamWatcher,
} from '@discord-bot/shared';
import { StreamNotifyModule } from './stream-notify.module';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;
const WATCHERS = '/api/v1/stream-watchers';

export function createHttpStreamNotifyModule(request: ApiRequest): StreamNotifyModule {
  return {
    getConfig$(guildId) {
      return from(orNull(request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`)));
    },
    createConfig$(guildId, channelId, message) {
      return from(
        request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`, {
          method: 'POST',
          body: JSON.stringify({ channelId, message }),
        })
      );
    },
    updateConfig$(guildId, data) {
      return from(
        request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      );
    },
    deleteConfig$(guildId) {
      return from(request<void>(`${base(guildId)}/stream-notify-config`, { method: 'DELETE' }));
    },
    getWatchers$(guildId) {
      return from(request<StreamWatcher[]>(`${base(guildId)}/stream-watchers`));
    },
    getAllWatchers$() {
      return from(request<StreamWatcher[]>(WATCHERS));
    },
    getWatcher$(guildId, platform, platformId) {
      return from(
        orNull(
          request<StreamWatcher>(
            `${base(guildId)}/stream-watchers/${platform}/${encodeURIComponent(platformId)}`
          )
        )
      );
    },
    addWatcher$(guildId, platform, platformId, displayName) {
      return from(
        request<StreamWatcher>(`${base(guildId)}/stream-watchers`, {
          method: 'POST',
          body: JSON.stringify({ platform, platformId, displayName }),
        })
      );
    },
    removeWatcher$(guildId, platform, platformId) {
      return from(
        request<void>(`${base(guildId)}/stream-watchers/${platform}/${encodeURIComponent(platformId)}`, {
          method: 'DELETE',
        })
      );
    },
    updateWatcherStatus$(id, isLive) {
      return from(
        request<StreamWatcher>(`${WATCHERS}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isLive }),
        })
      );
    },
    updateWatcherUserId$(id, platformUserId) {
      return from(
        request<StreamWatcher>(`${WATCHERS}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ platformUserId }),
        })
      );
    },
    updateLastChecked$(id) {
      return from(
        request<StreamWatcher>(`${WATCHERS}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ touch: true }),
        })
      );
    },
  };
}
