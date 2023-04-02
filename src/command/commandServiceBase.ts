import { ChatInputCommandInteraction, Guild } from "discord.js";
import { CommandError } from "../error/commandError";

export class CommandServiceBase {
  _interaction: ChatInputCommandInteraction;
  _guild: Guild;
  constructor(interaction: ChatInputCommandInteraction, onlyInGuild = true) {
    if (onlyInGuild && interaction.guild != null) {
      this._interaction = interaction;
      this._guild = interaction.guild;
    } else {
      throw new CommandError("Not in guild", "");
    }
  }
}
