import { CreateSlashApplicationCommand } from "discordeno/types";

// type subCommand = Omit<Command, "subcommand">;

// interface subCommandGroup {
//   name: string;
//   subCommands: subCommand[];
// }

export interface BaseCommand {
  name: string;
  scope: "Guild" | "DM" | "AuthorGuild";
  data: CreateSlashApplicationCommand;
}
