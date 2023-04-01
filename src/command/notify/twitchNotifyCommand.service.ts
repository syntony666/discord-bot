import {
  channelMention,
  ChatInputCommandInteraction,
  EmbedBuilder,
  EmbedField,
  hyperlink,
} from "discord.js";
import { embedColor } from "../../config";
import { TwitchNotifyModel } from "../../database/twitchNotifyModel";
import { TwitchStatusModel } from "../../database/twitchStatusModel";
import { DBConnectionService } from "../../service/DBConnectionService";
import { EmbedPageService } from "../../service/embedPageService";
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
      .setDescription("你們這堆臭DD!!!")
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
          throw new Error("");
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
            return new TwitchConnectionService()
              .getUserInfo([twitchUsername])
              ?.then((res) => resolve(res));
          })
      )
      .then(
        (res) => this._onRemoveSuccess(res),
        () => this._onRemoveReject()
      )
      .catch((err) => console.log(err));
  }
  public list() {
    this._twitchNotifyDTO
      .findAll({
        where: {
          guild_id: this._guildId,
        },
      })
      .then(
        (res) =>
          new Promise((resolve, reject) => {
            if (res.length == 0) {
              return reject();
            }
            return resolve(res);
          })
      )
      .then(
        (res) => this._onListSuccess(res),
        () => this._onListReject()
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

  private _onRemoveSuccess(streamerInfo: any) {
    if (streamerInfo.length === 0) {
      return this._interaction.reply({
        content: "此Twitch頻道似乎出現問題，已從通知名單刪除",
        ephemeral: false,
      });
    }
    const info = streamerInfo[0];
    let embed = this._getEmbedMessage()
      .setTitle("Twitch 通知已取消")
      .setDescription(
        hyperlink(
          `**${info.name}** (${info.twitch_id})`,
          `https://twitch.tv/${info.twitch_id}`
        )
      )
      .setThumbnail(info.profile_image_url ?? null);
    this._interaction.reply({ embeds: [embed], ephemeral: false });
  }

  private _onListSuccess(res: any) {
    let embedPageService: EmbedPageService;
    embedPageService = this._twitchListResult(res);
    embedPageService.run();
  }

  private _onRemoveReject() {
    this._interaction.reply({
      content: "此Twitch頻道通知尚未設定",
      ephemeral: true,
    });
  }

  private _onListReject() {
    this._interaction.reply({
      content: "目前沒有任何Twitch頻道通知",
      ephemeral: true,
    });
  }

  private _twitchListResult(res: any) {
    const resultList: EmbedField[] = res.map(
      (item: {
        guild_id: string;
        channel_id: string;
        twitch_id: string;
        message?: string;
      }) => {
        const twitchLink = `- ${hyperlink(
          "頻道連結",
          `https://twitch.tv/${item.twitch_id}`
        )}`;
        const notifyChannel = `\n- **通知頻道:** ${channelMention(
          item.channel_id
        )}`;
        const notifyMessage = item.message
          ? `\n- **通知訊息:** ${item.message}`
          : `\n- **❎ 通知訊息**`;
        return {
          name: item.twitch_id,
          value: twitchLink + notifyChannel + notifyMessage,
        };
      }
    );
    const embedPageService = new EmbedPageService(
      resultList,
      this._interaction
    );
    embedPageService.setEmbedTitle("Twitch通知列表");
    embedPageService
      .setEmbedColor(embedColor.get("twitch-notify") ?? null)
      .setEmbedDescription("你們這堆臭DD!!!")
      .setEmbedAuthor({
        name: this._interaction.user.username,
        iconURL: this._interaction.user.avatarURL() ?? undefined,
      })
      .setPageCount(true);
    return embedPageService;
  }
}
