import { EventHandlers } from "discordeno/*";
import { CommandManager } from "../command/command.manager";

export const interactionCreate: Partial<EventHandlers> = {
  interactionCreate(bot, interaction) {
    const commandManager = new CommandManager();
    commandManager.run(interaction.data?.name, bot, interaction);
  },
};

module.exports = interactionCreate;
