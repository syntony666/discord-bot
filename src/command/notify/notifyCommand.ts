import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interface/command";
import { CommonNotifySubcommandGroup } from "./commonNotify.subcmd";
import { TwitchNotifySubcommandGroup } from "./twitchNotify.subcmd";
import {
  CommonNotify,
  CommonNotifyCommandService,
  CommonNotifyOperation,
} from "./commonNotifyCommand.service";
import {
  TwitchNotify,
  TwitchNotifyCommandService,
} from "./twitchNotifyCommand.service";
import { CommandError } from "../../error/commandError";
import { ErrorBase } from "../../error/errorBase";

export const NotifyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("notify")
    .setDescription("通知設定")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(CommonNotifySubcommandGroup.guildJoin)
    .addSubcommandGroup(CommonNotifySubcommandGroup.guildLeave)
    .addSubcommandGroup(CommonNotifySubcommandGroup.MessageDelete)
    .addSubcommandGroup(TwitchNotifySubcommandGroup),
  execute: async (interaction) => {
    const commonNotifyService = new CommonNotifyCommandService(interaction);
    const twitchNotifyService = new TwitchNotifyCommandService(interaction);
    if (
      Object.values(CommonNotify).find(
        (val) => val === interaction.options.getSubcommandGroup()
      )
    ) {
      const commonNotify =
        interaction.options.getSubcommandGroup() as CommonNotify;
      switch (interaction.options.getSubcommand()) {
        case CommonNotifyOperation.ADD:
          const channel = interaction.options.get("channel")?.value as string;
          const message =
            (interaction.options.get("message")?.value as string) ?? undefined;
          commonNotifyService.add(commonNotify, channel, message);
          break;
        case CommonNotifyOperation.REMOVE:
          commonNotifyService.remove(commonNotify);
          break;
        case CommonNotifyOperation.LIST:
          commonNotifyService.list(commonNotify);
          break;
        default:
          throw new CommandError("No such command", interaction.toString());
      }
    } else if (
      interaction.options.getSubcommandGroup() === TwitchNotify.TWITCH
    ) {
      let twitchUsername: string | null, channel: string | null;
      switch (interaction.options.getSubcommand()) {
        case CommonNotifyOperation.ADD:
          const message = interaction.options.get("message")?.value as
            | string
            | undefined;
          twitchUsername = interaction.options.get("twitch-username")
            ?.value as string;
          channel = interaction.options.get("channel")?.value as string;
          twitchNotifyService.add(twitchUsername, channel, message);
          break;
        case CommonNotifyOperation.REMOVE:
          twitchUsername = interaction.options.get("twitch-username")
            ?.value as string;
          twitchNotifyService.remove(twitchUsername);
          break;
        case CommonNotifyOperation.LIST:
          twitchNotifyService.list();
          break;
        default:
          throw new CommandError("No such command", interaction.toString());
      }
    } else {
      throw new CommandError("No such command", interaction.toString());
    }
  },
};
