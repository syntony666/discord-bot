import {
  ApiRequest,
  orNull,
  StreamNotifyConfig,
  StreamPlatform,
  StreamWatcher,
} from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;
const WATCHERS = '/api/v1/stream-watchers';

export function createStreamNotifyModule(request: ApiRequest) {
  return {
    getConfig(guildId: string) {
      return orNull(request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`));
    },
    createConfig(guildId: string, channelId: string, message?: string) {
      return request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`, {
        method: 'POST',
        body: JSON.stringify({ channelId, message }),
      });
    },
    updateConfig(guildId: string, data: Partial<StreamNotifyConfig>) {
      return request<StreamNotifyConfig>(`${base(guildId)}/stream-notify-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    deleteConfig(guildId: string) {
      return request<void>(`${base(guildId)}/stream-notify-config`, { method: 'DELETE' });
    },
    getWatchers(guildId: string) {
      return request<StreamWatcher[]>(`${base(guildId)}/stream-watchers`);
    },
    getAllWatchers() {
      return request<StreamWatcher[]>(WATCHERS);
    },
    getWatcher(guildId: string, platform: StreamPlatform, platformId: string) {
      return orNull(
        request<StreamWatcher>(
          `${base(guildId)}/stream-watchers/${platform}/${encodeURIComponent(platformId)}`
        )
      );
    },
    addWatcher(guildId: string, platform: StreamPlatform, platformId: string, displayName: string) {
      return request<StreamWatcher>(`${base(guildId)}/stream-watchers`, {
        method: 'POST',
        body: JSON.stringify({ platform, platformId, displayName }),
      });
    },
    removeWatcher(guildId: string, platform: StreamPlatform, platformId: string) {
      return request<void>(
        `${base(guildId)}/stream-watchers/${platform}/${encodeURIComponent(platformId)}`,
        { method: 'DELETE' }
      );
    },
    updateWatcherStatus(id: string, isLive: boolean) {
      return request<StreamWatcher>(`${WATCHERS}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isLive }),
      });
    },
    updateWatcherUserId(id: string, platformUserId: string) {
      return request<StreamWatcher>(`${WATCHERS}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ platformUserId }),
      });
    },
    updateLastChecked(id: string) {
      return request<StreamWatcher>(`${WATCHERS}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ touch: true }),
      });
    },
  };
}

export type StreamNotifyModule = ReturnType<typeof createStreamNotifyModule>;
