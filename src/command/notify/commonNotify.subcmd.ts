import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import {
  CommonNotify,
  CommonNotifyOperation,
} from "../../command/notify/commonNotifyCommand.service";

export const CommonNotifySubcommandGroup = {
  guildJoin: new SlashCommandSubcommandGroupBuilder()
    .setName(CommonNotify.GUILD_JOIN)
    .setDescription("伺服器成員加入通知")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.ADD)
        .setDescription("新增/修改通知")
        .addChannelOption((option) => {
          return option
            .setName("channel")
            .setDescription("設定通知頻道")
            .setRequired(true);
        })
        .addStringOption((option) => {
          return option
            .setName("message")
            .setDescription("設定通知訊息")
            .setRequired(true);
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.REMOVE)
        .setDescription("移除通知")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName(CommonNotifyOperation.LIST).setDescription("列出通知")
    ),
  guildLeave: new SlashCommandSubcommandGroupBuilder()
    .setName(CommonNotify.GUILD_LEAVE)
    .setDescription("伺服器成員離開通知")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.ADD)
        .setDescription("新增/修改通知")
        .addChannelOption((option) => {
          return option
            .setName("channel")
            .setDescription("設定通知頻道")
            .setRequired(true);
        })
        .addStringOption((option) => {
          return option
            .setName("message")
            .setDescription("設定通知訊息")
            .setRequired(true);
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.REMOVE)
        .setDescription("移除通知")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName(CommonNotifyOperation.LIST).setDescription("列出通知")
    ),
  MessageDelete: new SlashCommandSubcommandGroupBuilder()
    .setName(CommonNotify.MESSAGE_DELETE)
    .setDescription("訊息刪除通知")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.ADD)
        .setDescription("新增/修改通知")
        .addChannelOption((option) => {
          return option
            .setName("channel")
            .setDescription("設定通知頻道")
            .setRequired(true);
        })
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(CommonNotifyOperation.REMOVE)
        .setDescription("移除通知")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName(CommonNotifyOperation.LIST).setDescription("列出通知")
    ),
};
