import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { GuildNotifyCommandService, GuildNotifyOperation } from "./guildNotifyCommand.service";

export const GuildNotifyCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('guild-notify')
        .setDescription('設定伺服器通知')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => {
            return subcommand
                .setName(GuildNotifyOperation.GUILD_JOIN)
                .setDescription('伺服器成員加入通知')
                .addChannelOption(option => {
                    return option
                        .setName('channel')
                        .setDescription('設定通知頻道')
                        .setRequired(true)
                })
                .addStringOption(option => {
                    return option
                        .setName('message')
                        .setDescription('設定通知訊息')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(GuildNotifyOperation.GUILD_LEAVE)
                .setDescription('伺服器成員離開通知')
                .addChannelOption(option => {
                    return option
                        .setName('channel')
                        .setDescription('設定通知頻道')
                        .setRequired(true)
                })
                .addStringOption(option => {
                    return option
                        .setName('message')
                        .setDescription('設定通知訊息')
                        .setRequired(true)
                })

        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(GuildNotifyOperation.MSG_DEL)
                .setDescription('訊息刪除通知')
                .addChannelOption(option => {
                    return option
                        .setName('channel')
                        .setDescription('設定通知頻道')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(GuildNotifyOperation.OFF)
                .setDescription('關閉通知')
                .addStringOption(option => {
                    return option
                        .setName('type')
                        .setDescription('選擇要關閉的通知 (關閉後若要重新開啟需重新設定)')
                        .addChoices(
                            { name: '伺服器成員加入通知', value: GuildNotifyOperation.GUILD_JOIN },
                            { name: '伺服器成員離開通知', value: GuildNotifyOperation.GUILD_LEAVE },
                            { name: '訊息刪除通知', value: GuildNotifyOperation.MSG_DEL }
                        )
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(GuildNotifyOperation.LIST)
                .setDescription('查看通知設定')
        }),
    execute: async (interaction) => {
        const guildNotifyCommandService = new GuildNotifyCommandService(interaction);
        let channel: string | null, message: string | null, type: GuildNotifyOperation | null;

        switch (interaction.options.getSubcommand()) {
            case GuildNotifyOperation.GUILD_JOIN:
                channel = interaction.options.get('channel')?.value as string;
                message = interaction.options.get('message')?.value as string;
                guildNotifyCommandService.guildJoin(channel, message);
                break;

            case GuildNotifyOperation.GUILD_LEAVE:
                channel = interaction.options.get('channel')?.value as string;
                message = interaction.options.get('message')?.value as string;
                guildNotifyCommandService.guildLeave(channel, message);
                break;

            case GuildNotifyOperation.MSG_DEL:
                channel = interaction.options.get('channel')?.value as string;
                guildNotifyCommandService.messageDelete(channel);
                break;

            case GuildNotifyOperation.OFF:
                type = interaction.options.get('type')?.value as GuildNotifyOperation;
                guildNotifyCommandService.off(type);
                break;

            case GuildNotifyOperation.LIST:
                guildNotifyCommandService.list()
                break;

        }
    }
}