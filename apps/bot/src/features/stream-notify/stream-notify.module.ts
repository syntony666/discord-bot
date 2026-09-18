import { PrismaClient } from '@prisma-client/client';
import { StreamWatcher, StreamNotifyConfig, StreamPlatform } from '@prisma-client/client';
import { from, Observable } from 'rxjs';

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

export function createStreamNotifyModule(prisma: PrismaClient): StreamNotifyModule {
  return {
    getConfig$(guildId: string) {
      return from(
        prisma.streamNotifyConfig.findUnique({
          where: { guildId },
        })
      );
    },

    createConfig$(guildId: string, channelId: string, message?: string) {
      return from(
        prisma.streamNotifyConfig.create({
          data: {
            guildId,
            channelId,
            message: message || '',
          },
        })
      );
    },

    updateConfig$(guildId: string, data: Partial<StreamNotifyConfig>) {
      return from(
        prisma.streamNotifyConfig.update({
          where: { guildId },
          data,
        })
      );
    },

    deleteConfig$(guildId: string) {
      return from(
        prisma.streamNotifyConfig.delete({
          where: { guildId },
        })
      ).pipe(() => from(Promise.resolve()));
    },

    getWatchers$(guildId: string) {
      return from(
        prisma.streamWatcher.findMany({
          where: { guildId },
          orderBy: { createdAt: 'asc' },
        })
      );
    },

    getAllWatchers$() {
      return from(
        prisma.streamWatcher.findMany({
          orderBy: { createdAt: 'asc' },
        })
      );
    },

    getWatcher$(guildId: string, platform: StreamPlatform, platformId: string) {
      return from(
        prisma.streamWatcher.findUnique({
          where: {
            guildId_platform_platformId: {
              guildId,
              platform,
              platformId,
            },
          },
        })
      );
    },

    addWatcher$(
      guildId: string,
      platform: StreamPlatform,
      platformId: string,
      displayName: string
    ) {
      return from(
        prisma.streamWatcher.create({
          data: {
            guildId,
            platform,
            platformId,
            displayName,
          },
        })
      );
    },

    removeWatcher$(guildId: string, platform: StreamPlatform, platformId: string) {
      return from(
        prisma.streamWatcher.delete({
          where: {
            guildId_platform_platformId: {
              guildId,
              platform,
              platformId,
            },
          },
        })
      ).pipe(() => from(Promise.resolve()));
    },

    updateWatcherStatus$(id: string, isLive: boolean) {
      return from(
        prisma.streamWatcher.update({
          where: { id },
          data: { isLive },
        })
      );
    },

    updateWatcherUserId$(id: string, platformUserId: string) {
      return from(
        prisma.streamWatcher.update({
          where: { id },
          data: { platformUserId },
        })
      );
    },

    updateLastChecked$(id: string) {
      return from(
        prisma.streamWatcher.update({
          where: { id },
          data: { lastChecked: new Date() },
        })
      );
    },
  };
}
