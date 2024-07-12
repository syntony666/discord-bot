import { readdirSync } from "fs";
import path from "path";
import { BaseCommand } from "./command.interface";
import { Bot } from "discordeno/*";
import { Interaction } from "discordeno/transformers";
import { InteractionResponseTypes } from "discordeno/types";

export class CommandManager {
  private commandFiles: string[];
  constructor() {
    const commandDir = path.resolve(__dirname);
    this.commandFiles = readdirSync(commandDir, {
      recursive: true,
      encoding: "utf-8",
    }).filter((file) => file.endsWith(".cmd.js"));
  }
  public load(client: Bot) {
    this.commandFiles.forEach((file) => {
      const cmd: BaseCommand = require(path.resolve(__dirname, file));
      if (cmd.scope === "Guild") {
        client.helpers.createGlobalApplicationCommand(cmd.data);
      }
    });
  }
  public run(name: string | undefined, bot: Bot, interaction: Interaction) {
    if (!name) {
      return;
    }
    this.commandFiles
      .map((file) => require(path.resolve(__dirname, file)))
      .find((command) => command.name === name)
      .handler(bot, interaction)
      .catch((error: unknown) => {
        let errorTitle: string | undefined;
        let errorMessage = "Unknown Error";
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorTitle = error.name;
          errorMessage = error.message;
        }
        console.log(error);
        if (interaction.channelId)
          bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
              embeds: [
                {
                  title: errorTitle,
                  description: errorMessage,
                },
              ],
            },
          });
      });
  }
}
