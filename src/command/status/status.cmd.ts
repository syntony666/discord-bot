import { ApplicationCommandOptionTypes } from "discordeno/types";
import { BaseCommand } from "../command.interface";
import { statusCmdHandler } from "./status.cmd-handler";

const statusCmd: BaseCommand = {
  name: "status",
  scope: "Guild",
  data: {
    name: "status",
    description: "取得相關資訊",
    options: [
      {
        name: "bot",
        description: "取得機器人資訊",
        type: ApplicationCommandOptionTypes.SubCommand,
      },
      {
        name: "guild",
        description: "取得伺服器資訊",
        type: ApplicationCommandOptionTypes.SubCommand,
      },
    ],
  },
  handler: statusCmdHandler,
};
module.exports = statusCmd;
