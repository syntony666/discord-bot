import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface/command";
import { TwitchNotifyCommandService, TwitchNotifyOperation } from "./twitchNotifyCommand.service";

export const TwitchNotifyCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('twitch-notify')
        .setDescription('設定Twitch開台通知')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => subcommand
            .setName(TwitchNotifyOperation.ADD)
            .setDescription('新增通知')
            .addStringOption(option => option
                .setName('twitch-username')
                .setDescription('Twitch 使用者名稱')
                .setRequired(true)
            )
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('設定通知頻道')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName(TwitchNotifyOperation.REMOVE)
            .setDescription('刪除通知')
            .addStringOption(option =>option
                .setName('twitch-username')
                .setDescription('Twitch 使用者名稱')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName(TwitchNotifyOperation.LIST)
            .setDescription('Twitch開台通知列表')),
    async execute(interaction) {
        const twitchNotifyCommandService = new TwitchNotifyCommandService(interaction);
        let twitchUsername: string | null, channel: string | null;
        switch (interaction.options.getSubcommand()) {
            case TwitchNotifyOperation.ADD:
                twitchUsername = interaction.options.get('twitch-username')?.value as string;
                channel = interaction.options.get('channel')?.value as string;
                twitchNotifyCommandService.add(twitchUsername, channel);
                break;
            case TwitchNotifyOperation.REMOVE:
                twitchUsername = interaction.options.get('twitch-username')?.value as string;
                twitchNotifyCommandService.remove(twitchUsername);
                break;
            case TwitchNotifyOperation.LIST:
                twitchNotifyCommandService.list();
                break;
        }
    },
}