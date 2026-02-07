import { StreamWatcher, StreamNotifyConfig, StreamPlatform, Prisma } from '@prisma-client/client';

export const streamNotifyRuntimeSelect = {
  id: true,
  guildId: true,
  platformId: true,
  platform: true,
  displayName: true,
  isLive: true,
  lastChecked: true,
  createdAt: true,
} as const satisfies Prisma.StreamWatcherSelect;

export const streamNotifyConfigRuntimeSelect = {
  guildId: true,
  channelId: true,
  enabled: true,
  message: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.StreamNotifyConfigSelect;

export type StreamWatcherRuntime = Prisma.StreamWatcherGetPayload<{
  select: typeof streamNotifyRuntimeSelect;
}>;

export type StreamNotifyConfigRuntime = Prisma.StreamNotifyConfigGetPayload<{
  select: typeof streamNotifyConfigRuntimeSelect;
}>;
