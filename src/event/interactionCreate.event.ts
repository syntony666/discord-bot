import { EventHandlers } from "@discordeno/bot";
import { CommandManager } from "../command/command.manager";

export const interactionCreate: Partial<EventHandlers> = {
  interactionCreate(interaction) {
    const commandManager = new CommandManager();
    commandManager.run(interaction.data?.name, interaction);
  },
};

module.exports = interactionCreate;
