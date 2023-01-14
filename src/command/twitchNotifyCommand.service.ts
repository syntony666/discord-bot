import { ChatInputCommandInteraction } from "discord.js";
import { TwitchNotifyModel } from "../database/twitchNotifyModel";
import { TwitchStatusModel } from "../database/twitchStatusModel";
import { DBConnectionService } from "../service/DBConnectionService";

export enum TwitchNotifyOperation {
    ADD = 'add',
    REMOVE = 'remove',
    LIST = 'list'
}

export class TwitchNotifyCommandService {
    private _interaction: ChatInputCommandInteraction;
    private _twitchNotifyDTO = DBConnectionService(TwitchNotifyModel);
    private _twitchStatusDTO = DBConnectionService(TwitchStatusModel);
    private _guildId: string = '';
    constructor(interaction: ChatInputCommandInteraction){
        if (interaction.guild != null) {
            this._interaction = interaction;
            this._guildId = interaction.guild.id;
        } else {
            // TODO: add error type
            throw new Error('')
        }}
    public add(twitchUsername: string, channel: string) {
        this._twitchStatusDTO.findOne({
            where: {
                twitch_id: twitchUsername
            }
        }).then(res => {
            if(res == null) {
                this._twitchStatusDTO.create({
                    twitch_id: twitchUsername
                })
            }
        }).then(() => {
            this._twitchNotifyDTO.create({
                guild_id: this._guildId,
                channel_id: channel,
                twitch_id: twitchUsername
            })
        })
    }
    public remove(twitchUsername: string) {
        this._twitchNotifyDTO.destroy({
            where: {
                guild_id: this._guildId,
                twitch_id: twitchUsername
            }
        }).then(res => new Promise<void>((resolve, reject) => {
            if (!res) {
                return reject();
            }
            return resolve();
        }))
    }
    public list() {
        this._twitchNotifyDTO.findAll({
            where: {
                guild_id: this._guildId
            }
        }).then(res => new Promise((resolve, reject) => {
            if (res.length == 0) {
                return reject();
            }
            return resolve(res);
        }))
    }
}
