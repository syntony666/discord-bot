import {
  channelMention,
  ChatInputCommandInteraction,
  EmbedBuilder,
  userMention,
} from "discord.js";
import { embedColor } from "../../config";
import { GuildModel } from "../../database/guildModel";
import { DBConnectionService } from "../../service/DBConnectionService";

import { FormatterHelper } from "../../helper/formatterHelper";

export enum CommonNotify {
  GUILD_JOIN = "guild-join",
  GUILD_LEAVE = "guild-leave",
  MESSAGE_DELETE = "message-delete",
}

export enum CommonNotifyOperation {
  ADD = "add",
  REMOVE = "remove",
  LIST = "list",
}

export class CommonNotifyCommandService {
  private _guildDTO = DBConnectionService(GuildModel);
  private _interaction: ChatInputCommandInteraction;
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
      .setColor(embedColor.get("common-notify") ?? null)
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

  public add(option: CommonNotify, channel: string, message?: string) {
    this._guildDTO
      .update(this._getAddQuery(option, channel, message), {
        where: { guild_id: this._guildId },
      })
      .then(() => this._onAddSuccess(option, channel, message ?? undefined))
      .catch((err) => this._onOperationFail(err));
  }

  public remove(option: CommonNotify) {
    this._guildDTO
      .update(this._getRemoveQuery(option), {
        where: { guild_id: this._guildId },
      })
      .then(() => this._onRemoveSuccess(option))
      .catch((err) => this._onOperationFail(err));
  }

  public list(option: CommonNotify) {
    this._guildDTO
      .findOne({
        where: {
          guild_id: this._guildId,
        },
      })
      .then((res) => this._onListSuccess(option, res))
      .catch((err) => this._onOperationFail(err));
  }

  private _getAddQuery(
    option: CommonNotify,
    channel: string,
    message?: string
  ) {
    if (option === CommonNotify.MESSAGE_DELETE) {
      return { message_delete_cid: channel };
    }
    if (option === CommonNotify.GUILD_JOIN) {
      return { guild_join_cid: channel, guild_join_msg: message };
    }
    if (option === CommonNotify.GUILD_LEAVE) {
      return { guild_leave_cid: channel, guild_leave_msg: message };
    }
    throw new Error("");
  }

  private _getRemoveQuery(option: CommonNotify) {
    if (option === CommonNotify.MESSAGE_DELETE) {
      return { message_delete_cid: null };
    }
    if (option === CommonNotify.GUILD_JOIN) {
      return { guild_join_cid: null, guild_join_msg: null };
    }
    if (option === CommonNotify.GUILD_LEAVE) {
      return { guild_leave_cid: null, guild_leave_msg: null };
    }
    throw new Error("");
  }

  private _onAddSuccess(
    option: CommonNotify,
    channel: string,
    message?: string
  ) {
    message = message ?? "";
    let embed = this._getEmbedMessage();
    const embedTitle = (option: CommonNotify) => {
      if (option === CommonNotify.GUILD_JOIN) {
        return "伺服器成員加入通知已設定";
      }
      if (option === CommonNotify.GUILD_LEAVE) {
        return "伺服器成員離開通知已設定";
      }
      if (option === CommonNotify.MESSAGE_DELETE) {
        return "訊息刪除通知已設定";
      }
      return null;
    };

    embed.setTitle(embedTitle(option)).addFields({
      name: "頻道",
      value: channelMention(channel),
      inline: true,
    });
    if (option === CommonNotify.GUILD_JOIN) {
      embed.addFields({
        name: "測試訊息",
        value: FormatterHelper.guildJoin(message, this._interaction.user),
        inline: true,
      });
    }
    if (option === CommonNotify.GUILD_LEAVE) {
      embed.addFields({
        name: "測試訊息",
        value: FormatterHelper.guildLeave(message, this._interaction.user),
        inline: true,
      });
    }
    this._interaction.reply({ embeds: [embed], ephemeral: false });
  }

  private _onRemoveSuccess(option: CommonNotify) {
    let title: string = "";
    if (option == CommonNotify.GUILD_JOIN) {
      title = "伺服器成員加入";
    }
    if (option == CommonNotify.GUILD_LEAVE) {
      title = "伺服器成員離開";
    }
    if (option == CommonNotify.MESSAGE_DELETE) {
      title = "訊息刪除";
    }
    let embed = this._getEmbedMessage().setTitle(`${title}通知已關閉`);
    this._interaction.reply({ embeds: [embed], ephemeral: false });
  }

  private _onListSuccess(option: CommonNotify, res: any) {
    const embedField = {
      [CommonNotify.GUILD_JOIN]: {
        name: (res.guild_join_cid ? "✅" : "❎") + " 成員加入通知",
        value: res.guild_join_cid
          ? `**發送頻道:**\n- ${channelMention(
              res.guild_join_cid
            )}\n**測試訊息:**\n- ${FormatterHelper.guildJoin(
              res.guild_join_msg,
              this._interaction.user
            )}`
          : "\u200B",
      },
      [CommonNotify.GUILD_LEAVE]: {
        name: (res.guild_leave_cid ? "✅" : "❎") + " 成員離開通知",
        value: res.guild_leave_cid
          ? `**發送頻道:**\n- ${channelMention(
              res.guild_leave_cid
            )}\n**測試訊息:**\n- ${FormatterHelper.guildLeave(
              res.guild_leave_msg,
              this._interaction.user
            )}`
          : "\u200B",
      },
      [CommonNotify.MESSAGE_DELETE]: {
        name: (res.message_delete_cid ? "✅" : "❎") + " 訊息刪除通知",
        value: res.message_delete_cid
          ? `**發送頻道:**\n- ${channelMention(res.message_delete_cid)}`
          : "\u200B",
      },
    };
    const embed = this._getEmbedMessage()
      .setTitle("通知設定")
      .setFields(embedField[option] ?? null);
    this._interaction.reply({ embeds: [embed], ephemeral: false });
  }

  private _onOperationFail(err: Error) {
    //TODO: add error type
    console.log(err);
  }
}
