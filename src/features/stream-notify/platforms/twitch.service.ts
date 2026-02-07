import { StreamPlatformService, StreamInfo } from './platform.interface';

interface TwitchStreamResponse {
  id: string;
  user_id: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
}

interface TwitchApiResponse {
  data: TwitchStreamResponse[];
  pagination?: {
    cursor?: string;
  };
}

export class TwitchService implements StreamPlatformService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  getPlatformName(): string {
    return 'twitch';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitch auth failed: ${response.statusText}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  async checkStreamStatus(platformIds: string[]): Promise<StreamInfo[]> {
    if (platformIds.length === 0) return [];

    const token = await this.getAccessToken();
    const batchSize = 100;
    const results: StreamInfo[] = [];

    for (let i = 0; i < platformIds.length; i += batchSize) {
      const batch = platformIds.slice(i, i + batchSize);
      const userIds = batch.join(',');

      const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${userIds}`,
        {
          headers: {
            'Client-ID': this.clientId,
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Twitch API error: ${response.statusText}`);
        continue;
      }

      const data = await response.json() as TwitchApiResponse;

      for (const stream of data.data) {
        results.push({
          platform: 'twitch',
          platformId: stream.user_id,
          displayName: stream.user_name,
          title: stream.title,
          url: `https://www.twitch.tv/${stream.user_name.toLowerCase()}`,
          game: stream.game_name,
          viewers: stream.viewer_count,
          thumbnailUrl: stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'),
          startedAt: new Date(stream.started_at),
        });
      }
    }

    return results;
  }
}
