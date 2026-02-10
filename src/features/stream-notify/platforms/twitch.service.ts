import { StreamPlatformService, StreamInfo } from './platform.interface';

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

  public async convertUsernamesToUserIds(usernames: string[]): Promise<Map<string, string>> {
    const token = await this.getAccessToken();
    const batchSize = 100;
    const usernameToIdMap = new Map<string, string>();

    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize);

      const response = await fetch(
        `https://api.twitch.tv/helix/users?login=${batch.join('&login=')}`,
        {
          headers: {
            'Client-ID': this.clientId,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = (await response.json()) as any;
        for (const user of data.data) {
          usernameToIdMap.set(user.login.toLowerCase(), user.id);
        }
      } else {
        console.error(`Failed to convert usernames to IDs: ${response.statusText}`);
      }
    }

    return usernameToIdMap;
  }

  async checkStreamStatus(platformIds: string[]): Promise<StreamInfo[]> {
    if (platformIds.length === 0) return [];

    const token = await this.getAccessToken();

    // Separate user_ids and user_logins
    const userIds: string[] = [];
    const userLogins: string[] = [];

    for (const id of platformIds) {
      // If it's all digits, treat as user_id, otherwise as user_login
      if (/^\d+$/.test(id)) {
        userIds.push(id);
      } else {
        userLogins.push(id);
      }
    }

    const results: StreamInfo[] = [];

    // Check by user_ids (more efficient)
    if (userIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const userIdParams = batch.map((id) => `user_id=${id}`).join('&');

        const response = await fetch(`https://api.twitch.tv/helix/streams?${userIdParams}`, {
          headers: {
            'Client-ID': this.clientId,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Twitch API error (user_ids): ${response.statusText}`, errorText);
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
            thumbnailUrl: stream.thumbnail_url
              .replace('{width}', '1280')
              .replace('{height}', '720'),
            startedAt: new Date(stream.started_at),
          });
        }
      }
    }

    // Check by user_logins (for new watchers)
    if (userLogins.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < userLogins.length; i += batchSize) {
        const batch = userLogins.slice(i, i + batchSize);
        const userLoginParams = batch.map((login) => `user_login=${login}`).join('&');

        const response = await fetch(`https://api.twitch.tv/helix/streams?${userLoginParams}`, {
          headers: {
            'Client-ID': this.clientId,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Twitch API error (user_logins): ${response.statusText}`, errorText);
          continue;
        }

        const data = (await response.json()) as TwitchApiResponse;

        for (const stream of data.data) {
          results.push({
            platform: 'twitch',
            platformId: stream.user_id, // Still return user_id for consistency
            displayName: stream.user_name,
            title: stream.title,
            url: `https://www.twitch.tv/${stream.user_login}`,
            game: stream.game_name,
            viewers: stream.viewer_count,
            thumbnailUrl: stream.thumbnail_url
              .replace('{width}', '1280')
              .replace('{height}', '720'),
            startedAt: new Date(stream.started_at),
          });
        }
      }
    }

    return results;
  }
}
