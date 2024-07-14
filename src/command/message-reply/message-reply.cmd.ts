import { ApplicationCommandOption, ApplicationCommandOptionTypes } from "@discordeno/bot";
import { BaseCommand } from "../command.interface";
import { messageReplyCmdHandler } from "./message-reply-handler";

const inputOptions: ApplicationCommandOption = {
  name: "input",
  description: "輸入關鍵字",
  type: ApplicationCommandOptionTypes.String,
  required: true,
};

const outputOptions: ApplicationCommandOption = {
  name: "output",
  description: "輸入回覆內容",
  type: ApplicationCommandOptionTypes.String,
  required: true,
};

const messageReplyCmd: BaseCommand = {
  name: "message-reply",
  scope: "Guild",
  data: {
    name: "message-reply",
    description: "回覆訊息設定",
    options: [
      {
        name: "add",
        description: "新增回覆訊息",
        type: ApplicationCommandOptionTypes.SubCommand,
        options: [inputOptions, outputOptions],
      },
      {
        name: "edit",
        description: "修改回覆訊息",
        type: ApplicationCommandOptionTypes.SubCommand,
        options: [inputOptions],
      },
      {
        name: "list",
        description: "回覆訊息列表",
        type: ApplicationCommandOptionTypes.SubCommand,
      },
      {
        name: "remove",
        description: "刪除回覆訊息",
        type: ApplicationCommandOptionTypes.SubCommand,
        options: [inputOptions],
      },
      {
        name: "search",
        description: "搜尋回覆訊息",
        type: ApplicationCommandOptionTypes.SubCommand,
        options: [inputOptions],
      },
    ],
  },
  handler: messageReplyCmdHandler,
};
module.exports = messageReplyCmd;
