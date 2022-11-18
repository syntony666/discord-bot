import { Client, Message, TextChannel } from "discord.js";

export class MessageUrlService {
    private _url: string;
    private _currentGuildId: string;
    private _client: Client;
    private _message: Message | null;

    constructor(url: string, currentGuildId: string, client: Client) {
        this._url = url;
        this._currentGuildId = currentGuildId;
        this._client = client
        this._message = null;
    }

    public async getMessage() {
        let re = new RegExp('(https?:\/\/discord\.com\/channels)[\/][0-9]+[\/][0-9]+[\/][0-9]+$');

        if (!re.test(this._url)) {
            return Promise.reject('Invaild URL');
        }

        let guildId = this._url.split('/')[4];
        let channelId = this._url.split('/')[5];
        let messageId = this._url.split('/')[6];

        if (guildId !== this._currentGuildId) {
            return Promise.reject('Invaild Guild ID');
        }

        return this._client.channels.fetch(channelId)
            .then((channel) => (channel as TextChannel).messages.fetch(messageId))
            .then((message) => message)
    }
}
