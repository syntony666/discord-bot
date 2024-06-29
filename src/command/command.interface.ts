import { Bot } from "discordeno/*";
import { Interaction } from "discordeno/transformers";
import { CreateSlashApplicationCommand } from "discordeno/types";

export interface BaseCommand {
  name: string;
  scope: "Guild" | "DM" | "AuthorGuild";
  data: CreateSlashApplicationCommand;
  handler: (bot: Bot, interaction: Interaction) => Promise<void | Error>;
}
