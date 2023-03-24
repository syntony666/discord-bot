import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interface/command";
import { CommonNotifySubcommandGroup } from "./commonNotify.subcmd";
import {
  CommonNotify,
  CommonNotifyCommandService,
  CommonNotifyOperation,
} from "./commonNotifyCommand.service";

export const NotifyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("notify")
    .setDescription("通知設定")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(CommonNotifySubcommandGroup.guildJoin)
    .addSubcommandGroup(CommonNotifySubcommandGroup.guildLeave)
    .addSubcommandGroup(CommonNotifySubcommandGroup.MessageDelete),
  execute: async (interaction) => {
    const service = new CommonNotifyCommandService(interaction);
    const channel = interaction.options.get("channel")?.value as string;
    const message =
      (interaction.options.get("message")?.value as string) ?? undefined;
    if (
      Object.values(CommonNotify).find(
        (val) => val === interaction.options.getSubcommandGroup()
      )
    ) {
      const commonNotify =
        interaction.options.getSubcommandGroup() as CommonNotify;
      if (interaction.options.getSubcommand() === CommonNotifyOperation.ADD) {
        service.add(commonNotify, channel, message);
      }
      if (
        interaction.options.getSubcommand() === CommonNotifyOperation.REMOVE
      ) {
        service.remove(commonNotify);
      }
      if (interaction.options.getSubcommand() === CommonNotifyOperation.LIST) {
        service.list(commonNotify);
      }
    }
  },
};
