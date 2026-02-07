import { StreamPlatformService, StreamInfo } from './platform.interface';

interface YouTubeLiveBroadcastResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeLiveBroadcast[];
}

interface YouTubeLiveBroadcast {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    scheduledStartTime: string;
    actualStartTime?: string;
    scheduledEndTime?: string;
    actualEndTime?: string;
    thumbnails: {
      default?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      maxres?: YouTubeThumbnail;
    };
  };
  status: {
    lifeCycleStatus: 'created' | 'ready' | 'testing' | 'live' | 'complete';
    privacyStatus: string;
    recordingStatus?: string;
  };
  contentDetails: {
    boundStreamId?: string;
    monitorStream?: {
      enableMonitorStream: boolean;
      broadcastStreamDelayMs: number;
      embedHtml: string;
    };
  };
}

interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeChannelResponse {
  items: YouTubeChannel[];
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
  };
}

export class YouTubeService implements StreamPlatformService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getPlatformName(): string {
    return 'youtube';
  }

  private async getChannelInfo(channelIds: string[]): Promise<Map<string, string>> {
    if (channelIds.length === 0) return new Map();

    const batchSize = 50;
    const channelMap = new Map<string, string>();

    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize);
      const ids = batch.join(',');

      const response = await fetch(
        `${this.baseUrl}/channels?part=snippet&id=${ids}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error(`YouTube channels API error: ${response.statusText}`);
        continue;
      }

      const data = await response.json() as YouTubeChannelResponse;

      for (const channel of data.items) {
        channelMap.set(channel.id, channel.snippet.title);
      }
    }

    return channelMap;
  }

  async checkStreamStatus(platformIds: string[]): Promise<StreamInfo[]> {
    if (platformIds.length === 0) return [];

    const batchSize = 50;
    const results: StreamInfo[] = [];

    for (let i = 0; i < platformIds.length; i += batchSize) {
      const batch = platformIds.slice(i, i + batchSize);
      const ids = batch.join(',');

      const response = await fetch(
        `${this.baseUrl}/liveBroadcasts?part=id,snippet,status&broadcastStatus=active&channelId=${ids}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.error(`YouTube live broadcasts API error: ${response.statusText}`);
        continue;
      }

      const data = await response.json() as YouTubeLiveBroadcastResponse;

      if (data.items.length === 0) continue;

      const channelMap = await this.getChannelInfo(batch);

      for (const broadcast of data.items) {
        if (broadcast.status.lifeCycleStatus !== 'live') continue;

        const channelId = broadcast.snippet.channelId;
        const channelName = channelMap.get(channelId) || `Channel ${channelId}`;

        const thumbnail = broadcast.snippet.thumbnails.maxres || 
                          broadcast.snippet.thumbnails.high || 
                          broadcast.snippet.thumbnails.medium || 
                          broadcast.snippet.thumbnails.default;

        results.push({
          platform: 'youtube',
          platformId: channelId,
          displayName: channelName,
          title: broadcast.snippet.title,
          url: `https://www.youtube.com/watch?v=${broadcast.id}`,
          thumbnailUrl: thumbnail?.url,
          startedAt: broadcast.snippet.actualStartTime ? 
                     new Date(broadcast.snippet.actualStartTime) : 
                     new Date(broadcast.snippet.scheduledStartTime),
        });
      }
    }

    return results;
  }
}
