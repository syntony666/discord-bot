import { CreateSlashApplicationCommand, Bot, Interaction } from "@discordeno/bot";

export interface BaseCommand {
  name: string;
  scope: "Guild" | "DM" | "AuthorGuild";
  data: CreateSlashApplicationCommand;
  handler: (interaction: Interaction) => Promise<void | Error>;
}
