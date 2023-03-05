import { Emoji, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface/command";
import { ReactionRoleCommandService, ReactionRoleOperation } from "./reactionRoleCommand.service";

export const ReactionRoleCommand: Command = {
    data: new SlashCommandBuilder()
    .setName('reaction-role')
    .setDescription('按下特定訊息上的表情符號可以得到指定的身份組')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand => {
        return subcommand
            .setName(ReactionRoleOperation.ADD)
            .setDescription('新增要發派的身份組及指定的訊息與表情符號')
            .addRoleOption(option => {
                return option
                    .setName('role')
                    .setDescription('選擇身份組')
                    .setRequired(true)
            })
            .addStringOption(option => {
                return option
                    .setName('emoji')
                    .setDescription('輸入表情符號')
                    .setRequired(true)
            })
            .addStringOption(option => {
                return option
                    .setName('message-url')
                    .setDescription('輸入訊息連結')
                    .setRequired(true)
            })
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(ReactionRoleOperation.REMOVE)
            .setDescription('移除要發派的身份組')
            .addRoleOption(option => {
                return option
                    .setName('role')
                    .setDescription('選擇身份組')
                    .setRequired(true)
            })
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName('remove-message')
            .setDescription('移除指定訊息的所有發派的身份組')
            .addStringOption(option => {
                return option
                    .setName('message-url')
                    .setDescription('輸入訊息連結')
                    .setRequired(true)
            })
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName('list')
            .setDescription('列出所有的要發派的身份組')
    }),
    execute: async(interaction) => {
        const reactionRoleCommandService = new ReactionRoleCommandService(interaction);
        let role: string | null, emoji: string | null, messageUrl: string | null;

        switch (interaction.options.getSubcommand()) {
            case ReactionRoleOperation.ADD:
                role = interaction.options.get('role')?.value as string;
                emoji = interaction.options.get('emoji')?.value as string;
                messageUrl = interaction.options.get('message-url')?.value as string;
                reactionRoleCommandService.add(role, emoji, messageUrl);
                break;

            case ReactionRoleOperation.REMOVE:
                role = interaction.options.get('role')?.value as string;
                reactionRoleCommandService.remove(role);
                break;

            case ReactionRoleOperation.REMOVE_MSG:
                messageUrl = interaction.options.get('message-url')?.value as string
                reactionRoleCommandService.removeMessage(messageUrl);
                break;

            case ReactionRoleOperation.LIST:
                reactionRoleCommandService.list();
                break;

            default:
                // TODO: add error type
                throw new Error('')
        }
    },
}