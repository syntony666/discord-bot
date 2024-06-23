import { Bot } from "discordeno/*";
import { readdirSync } from "fs";
import path from "path";
import { BaseCommand } from "./command.interface";

export class CommandManager {
  private client: Bot;
  constructor(client: Bot) {
    this.client = client;
  }
  public load() {
    const commandDir = path.resolve(__dirname);
    const commandFiles = readdirSync(commandDir, {
      recursive: true,
      encoding: "utf-8",
    }).filter((file) => file.endsWith(".cmd.js"));

    commandFiles.forEach((file) => {
      const cmd: BaseCommand = require(path.resolve(__dirname, file));
      if (cmd.scope === "Guild") {
        this.client.helpers.createGlobalApplicationCommand(cmd.data);
      }
    });
  }
}
