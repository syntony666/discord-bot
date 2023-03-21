export class TwitchConnectionService {
  private _clientID: string;
  private _clientSecret: string;
  constructor() {
    this._clientID = process.env.TWITCH_CLIENT_ID as string;
    this._clientSecret = process.env.TWITCH_CLIENT_SECRET as string;
  }
  private async _getAuthData() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${this._clientID}&client_secret=${this._clientSecret}&grant_type=client_credentials`;

    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

    const res = await fetch(url, {
      method: 'POST',
    });
    const data = await res.json();
    return {
      token: data.access_token,
      type: capitalize(data.token_type),
    };
  }

  public getStreamStatus(usernames: string[]) {
    if (usernames.length >= 100) return;
    let result: any = {};
    let query = '';
    usernames.forEach((user, index) => {
      if (index == 0) query += `user_login=${user}`;
      else query += `&user_login=${user}`;
      result[user] = false;
    });
    const userUrl = `https://api.twitch.tv/helix/streams?${query}`;

    return this._getAuthData()
      .then((data) =>
        fetch(userUrl, {
          method: "GET",
          headers: {
            Authorization: `${data.type} ${data.token}`,
            "Client-Id": this._clientID,
          },
        })
      )
      .then((res) => res.json())
      .then((data) =>
        data.data
          ? data.data.map((res: any) => ({
              twitch_id: res.user_login,
              is_streaming: true,
              title: res.title,
              game_name: res.game_name,
              name: res.user_name,
            }))
          : []
      );
  }

  public getUserInfo(usernames: string[]) {
    if (usernames.length >= 100) return;
    let result: any = {};
    let query = '';
    usernames.forEach((user, index) => {
      if (index == 0) query += `login=${user}`;
      else query += `&login=${user}`;
      result[user] = false;
    });
    const userUrl = `https://api.twitch.tv/helix/users?${query}`;

    return this._getAuthData()
      .then((data) =>
        fetch(userUrl, {
          method: 'GET',
          headers: {
            Authorization: `${data.type} ${data.token}`,
            'Client-Id': this._clientID,
          },
        })
      )
      .then((res) => res.json())
      .then((data) =>
        data.data
          ? data.data.map((res: any) => ({
          twitch_id: res.login,
          profile_image_url: res.profile_image_url,
          }))
          : []
      );
  }
}