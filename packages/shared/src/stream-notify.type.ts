import { StreamPlatform } from './enums';

export interface StreamWatcher {
  id: string;
  guildId: string;
  platformId: string;
  platformUserId: string | null;
  platform: StreamPlatform;
  displayName: string;
  avatarImageUrl: string | null;
  isLive: boolean;
  lastChecked: string;
  createdAt: string;
}

export interface StreamNotifyConfig {
  guildId: string;
  channelId: string;
  enabled: boolean;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type StreamWatcherRuntime = Pick<
  StreamWatcher,
  | 'id'
  | 'guildId'
  | 'platformId'
  | 'platform'
  | 'displayName'
  | 'avatarImageUrl'
  | 'isLive'
  | 'lastChecked'
  | 'createdAt'
>;

export type StreamNotifyConfigRuntime = Pick<
  StreamNotifyConfig,
  'guildId' | 'channelId' | 'enabled' | 'message' | 'createdAt' | 'updatedAt'
>;

export interface CreateStreamNotifyConfigInput {
  guildId: string;
  channelId: string;
  message?: string;
}

export interface UpdateStreamNotifyConfigInput {
  channelId?: string;
  enabled?: boolean;
  message?: string;
}

export interface CreateStreamWatcherInput {
  guildId: string;
  platform: StreamPlatform;
  platformId: string;
  platformUserId?: string;
  displayName: string;
  avatarImageUrl?: string;
}
