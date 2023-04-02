import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  time,
} from "discord.js";
import { embedColor, CLIENT_VERSION } from "../config";
import { CommandServiceBase } from "./commandServiceBase";

export enum StatusOperation {
  BOT = "bot",
  SERVER = "server",
}

export class StatusCommandService extends CommandServiceBase {
  private _avatar_bg: AttachmentBuilder = new AttachmentBuilder(
    "./assets/avatar_bg.png"
  );
  private _logo = new AttachmentBuilder("./assets/logo.png");
  private _discord_js = new AttachmentBuilder("./assets/discord_js.png");

  constructor(interaction: ChatInputCommandInteraction) {
    super(interaction);
  }

  private _getEmbedMessage(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(embedColor.get("status") ?? null)
      .setDescription("做這種事才不是為了你呢...!")
      .setTimestamp();
  }

  public bot() {
    const embed = this._getEmbedMessage()
      .setTitle(this._interaction.client.user?.username ?? null)
      .setAuthor({ name: "自我介紹", iconURL: "attachment://logo.png" })
      .setThumbnail("attachment://avatar_bg.png")
      .addFields(
        {
          name: "Bot Ping",
          value: `\`${Date.now() - this._interaction.createdAt.getTime()} ms\``,
          inline: true,
        },
        {
          name: "API Ping",
          value: `\`${this._interaction.client.ws.ping} ms\``,
          inline: true,
        }
      )
      .setFooter({
        text: `ver. ${CLIENT_VERSION}`,
        iconURL: "attachment://discord_js.png",
      });
    this._interaction.reply({
      embeds: [embed],
      files: [this._avatar_bg, this._logo, this._discord_js],
      components: [this._getBotButtons()],
      ephemeral: false,
    });
  }

  public server() {
    this._guild
      .fetchOwner()
      .then((owner) => {
        return owner.user.tag;
      })
      .then((ownerTag) => {
        const embed = new EmbedBuilder()
          .setTitle(this._guild.name)
          .setAuthor({ name: "伺服器資訊", iconURL: "attachment://logo.png" })
          .setFields(
            { name: "伺服器擁有者", value: ownerTag, inline: true },
            {
              name: "創立時間",
              value: time(this._guild.createdAt),
              inline: true,
            },
            {
              name: "成員數量",
              value: `${this._guild.memberCount}`,
              inline: false,
            }
          )
          .setThumbnail(this._guild.iconURL() ?? "")
          .setFooter({
            text: this._interaction.user.tag,
            iconURL: this._interaction.user.avatarURL() ?? "",
          });
        this._interaction.reply({
          embeds: [embed],
          files: [this._logo],
          ephemeral: false,
        });
      });
  }

  private _getBotButtons(): any {
    return new ActionRowBuilder().setComponents(
      new ButtonBuilder()
        .setLabel("使用說明")
        .setURL("https://discord-bot.syntony666.com/")
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel("邀請連結")
        .setURL(
          "https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot"
        )
        .setStyle(ButtonStyle.Link)
    );
  }
}
