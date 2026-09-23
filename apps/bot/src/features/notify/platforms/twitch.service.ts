import { StreamPlatformService, StreamInfo } from './platform.interface';
import { createLogger } from '@discord-bot/shared';

const log = createLogger('TwitchService');

interface TwitchStreamResponse {
  id: string;
  user_id: string;
  user_login: string;
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

export interface TwitchUserProfile {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface TwitchUsersApiResponse {
  data: TwitchUserProfile[];
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

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  public async getUsersByField(
    field: 'id' | 'login',
    values: string[]
  ): Promise<TwitchUserProfile[]> {
    if (values.length === 0) return [];

    const token = await this.getAccessToken();
    const batchSize = 100;
    const results: TwitchUserProfile[] = [];

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const params = batch.map((v) => `${field}=${v}`).join('&');

      const response = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
        headers: {
          'Client-ID': this.clientId,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        log.error({ statusText: response.statusText }, 'Failed to fetch Twitch users');
        continue;
      }

      const data = (await response.json()) as TwitchUsersApiResponse;
      results.push(...data.data);
    }

    return results;
  }

  public async convertUsernamesToUserIds(usernames: string[]): Promise<Map<string, string>> {
    const users = await this.getUsersByField('login', usernames);
    return new Map(users.map((u) => [u.login.toLowerCase(), u.id]));
  }

  private async fetchStreams(
    key: 'user_id' | 'user_login',
    values: string[],
    token: string
  ): Promise<StreamInfo[]> {
    const results: StreamInfo[] = [];
    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100);
      const params = batch.map((v) => `${key}=${encodeURIComponent(v)}`).join('&');

      const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
        headers: {
          'Client-ID': this.clientId,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error({ statusText: response.statusText, errorText, key }, 'Twitch API error');
        continue;
      }

      const data = (await response.json()) as TwitchApiResponse;

      for (const stream of data.data) {
        results.push({
          platform: 'twitch',
          platformId: stream.user_id,
          displayName: stream.user_name,
          title: stream.title,
          url: `https://www.twitch.tv/${stream.user_login}`,
          game: stream.game_name,
          viewers: stream.viewer_count,
          startedAt: new Date(stream.started_at),
        });
      }
    }
    return results;
  }

  async checkStreamStatus(platformIds: string[]): Promise<StreamInfo[]> {
    if (platformIds.length === 0) return [];

    const token = await this.getAccessToken();

    // Numeric ids are user_ids (more efficient), the rest are user_logins
    const userIds = platformIds.filter((id) => /^\d+$/.test(id));
    const userLogins = platformIds.filter((id) => !/^\d+$/.test(id));

    return [
      ...(await this.fetchStreams('user_id', userIds, token)),
      ...(await this.fetchStreams('user_login', userLogins, token)),
    ];
  }
}
