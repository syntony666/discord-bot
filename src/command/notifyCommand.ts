import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { NotifyCommandService, NotifyOperation } from "./notifyCommand.service";

export const NotifyCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('notify')
        .setDescription('設定伺服器通知')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => {
            return subcommand
                .setName(NotifyOperation.GUILD_JOIN)
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
                .setName(NotifyOperation.GUILD_LEAVE)
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
                .setName(NotifyOperation.MSG_DEL)
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
                .setName(NotifyOperation.OFF)
                .setDescription('關閉通知')
                .addStringOption(option => {
                    return option
                        .setName('type')
                        .setDescription('選擇要關閉的通知 (關閉後若要重新開啟需重新設定)')
                        .addChoices(
                            { name: '伺服器成員加入通知', value: NotifyOperation.GUILD_JOIN },
                            { name: '伺服器成員離開通知', value: NotifyOperation.GUILD_LEAVE },
                            { name: '訊息刪除通知', value: NotifyOperation.MSG_DEL }
                        )
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(NotifyOperation.LIST)
                .setDescription('查看通知設定')
        }),
    execute: async (interaction) => {
        const notifyCommandService = new NotifyCommandService(interaction);
        let channel: string | null, message: string | null, type: NotifyOperation | null;

        switch (interaction.options.getSubcommand()) {
            case NotifyOperation.GUILD_JOIN:
                channel = interaction.options.get('channel')?.value as string;
                message = interaction.options.get('message')?.value as string;
                notifyCommandService.guildJoin(channel, message);
                break;

            case NotifyOperation.GUILD_LEAVE:
                channel = interaction.options.get('channel')?.value as string;
                message = interaction.options.get('message')?.value as string;
                notifyCommandService.guildLeave(channel, message);
                break;

            case NotifyOperation.MSG_DEL:
                channel = interaction.options.get('channel')?.value as string;
                notifyCommandService.messageDelete(channel);
                break;

            case NotifyOperation.OFF:
                type = interaction.options.get('type')?.value as NotifyOperation;
                notifyCommandService.off(type);
                break;

            case NotifyOperation.LIST:
                notifyCommandService.list()
                break;

        }
    }
}