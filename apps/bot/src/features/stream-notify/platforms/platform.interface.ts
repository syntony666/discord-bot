export interface StreamInfo {
  platform: 'twitch' | 'youtube';
  platformId: string;
  displayName: string;
  title: string;
  url: string;
  game?: string;
  viewers?: number;
  startedAt?: Date;
}

export interface StreamPlatformService {
  checkStreamStatus(platformIds: string[]): Promise<StreamInfo[]>;
  getPlatformName(): string;
}
