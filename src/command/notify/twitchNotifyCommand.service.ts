import {
  channelLink,
  channelMention,
  ChatInputCommandInteraction,
  EmbedBuilder,
  hyperlink,
} from "discord.js";
import { embedColor } from "../../config";
import { TwitchNotifyModel } from "../../database/twitchNotifyModel";
import { TwitchStatusModel } from "../../database/twitchStatusModel";
import { DBConnectionService } from "../../service/DBConnectionService";
import { TwitchConnectionService } from "../../service/twitchConnectionService";

export enum TwitchNotifyOperation {
  ADD = "add",
  REMOVE = "remove",
  LIST = "list",
}

export enum TwitchNotify {
  TWITCH = "twitch",
}

export class TwitchNotifyCommandService {
  private _interaction: ChatInputCommandInteraction;
  private _twitchNotifyDTO = DBConnectionService(TwitchNotifyModel);
  private _twitchStatusDTO = DBConnectionService(TwitchStatusModel);
  private _guildId: string = "";
  constructor(interaction: ChatInputCommandInteraction) {
    if (interaction.guild != null) {
      this._interaction = interaction;
      this._guildId = interaction.guild.id;
    } else {
      // TODO: add error type
      throw new Error("");
    }
  }

  private _getEmbedMessage(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(embedColor.get("twitch-notify") ?? null)
      .setAuthor({
        name: this._interaction.client.user?.username ?? "",
        iconURL: this._interaction.client.user?.avatarURL() ?? undefined,
      })
      .setDescription("事情都我在幫你做 = =")
      .setFooter({
        text: this._interaction.user.tag,
        iconURL: this._interaction.user.avatarURL() ?? undefined,
      })
      .setTimestamp();
  }
  public add(twitchUsername: string, channel: string, message?: string) {
    let streamerInfo: any;
    new TwitchConnectionService()
      .getUserInfo([twitchUsername])
      ?.then((res) => {
        if (res.length === 0) {
          throw Error();
        }
        streamerInfo = res[0];
      })
      .then(() =>
        this._twitchStatusDTO.findOne({
          where: {
            twitch_id: twitchUsername,
          },
        })
      )
      .then((res) => {
        if (res == null) {
          return this._twitchStatusDTO.create({
            twitch_id: twitchUsername,
          });
        }
        return;
      })
      .then(() => {
        return this._twitchNotifyDTO.create({
          guild_id: this._guildId,
          channel_id: channel,
          twitch_id: twitchUsername,
          message: message,
        });
      })
      .then(() => {
        this._onAddSuccess(streamerInfo, channel, message);
      })
      .catch((err) => console.log(err));
  }
  public remove(twitchUsername: string) {
    this._twitchNotifyDTO
      .destroy({
        where: {
          guild_id: this._guildId,
          twitch_id: twitchUsername,
        },
      })
      .then(
        (res) =>
          new Promise<void>((resolve, reject) => {
            if (!res) {
              return reject();
            }
            return resolve();
          })
      )
      .catch((err) => console.log(err));
  }
  public list() {
    this._twitchNotifyDTO
      .findAll({
        where: {
          // guild_id: this._guildId,
        },
      })
      .then(
        (res) => console.log(res)
        // new Promise((resolve, reject) => {
        //   if (res.length == 0) {
        //     return reject();
        //   }
        //   return resolve(res);
        // })
      );
  }
  private _onAddSuccess(
    streamerInfo: any,
    channel: string,
    message: string | undefined
  ) {
    let embed = this._getEmbedMessage()
      .setTitle("Twitch 通知已設定")
      .setDescription(
        hyperlink(
          `**${streamerInfo.name}** (${streamerInfo.twitch_id})`,
          `https://twitch.tv/${streamerInfo.twitch_id}`
        )
      )
      .addFields(
        {
          name: "通知頻道",
          value: channelMention(channel),
        },
        {
          name: message ? "通知訊息" : "❎ 通知訊息",
          value: message ? message : "\u200B",
        }
      )
      .setThumbnail(streamerInfo.profile_image_url ?? null);
    this._interaction.reply({ embeds: [embed], ephemeral: false });
  }
}
