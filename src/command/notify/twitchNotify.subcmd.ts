import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import {
  TwitchNotify,
  TwitchNotifyOperation,
} from "./twitchNotifyCommand.service";

export const TwitchNotifySubcommandGroup =
  new SlashCommandSubcommandGroupBuilder()
    .setName(TwitchNotify.TWITCH)
    .setDescription("設定Twitch開台通知")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(TwitchNotifyOperation.ADD)
        .setDescription("新增Twitch開台通知")
        .addStringOption((option) =>
          option
            .setName("twitch-username")
            .setDescription("Twitch 使用者名稱")
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("設定通知頻道")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("設定通知訊息")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(TwitchNotifyOperation.REMOVE)
        .setDescription("刪除Twitch開台通知")
        .addStringOption((option) =>
          option
            .setName("twitch-username")
            .setDescription("Twitch 使用者名稱")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(TwitchNotifyOperation.LIST)
        .setDescription("Twitch開台通知列表")
    );
