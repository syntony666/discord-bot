import { SlashCommandBuilder } from "discord.js";
import { Command } from "../interface/command";
import { ReplyCommandService, ReplyOperation } from "./replyCommand.service";

export const ReplyCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('設定回覆功能')
        .addSubcommand(subcommand => {
            return subcommand
                .setName(ReplyOperation.ADD)
                .setDescription('新增回覆內容')
                .addStringOption(option => {
                    return option
                        .setName('input')
                        .setDescription('輸入關鍵字')
                        .setRequired(true)
                })
                .addStringOption(option => {
                    return option
                        .setName('output')
                        .setDescription('輸入回覆內容')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(ReplyOperation.EDIT)
                .setDescription('編輯回覆內容')
                .addStringOption(option => {
                    return option
                        .setName('input')
                        .setDescription('輸入關鍵字')
                        .setRequired(true)
                })
                .addStringOption(option => {
                    return option
                        .setName('output')
                        .setDescription('輸入回覆內容')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(ReplyOperation.REMOVE)
                .setDescription('移除回覆內容')
                .addStringOption(option => {
                    return option
                        .setName('input')
                        .setDescription('輸入關鍵字')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(ReplyOperation.SEARCH)
                .setDescription('從關鍵字搜尋回覆內容')
                .addStringOption(option => {
                    return option
                        .setName('input')
                        .setDescription('輸入關鍵字')
                        .setRequired(true)
                })
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(ReplyOperation.LIST)
                .setDescription('列出所有的回應內容')
        }),
    execute: async (interaction) => {
        const replyCommandService = new ReplyCommandService(interaction);
        let input: string | null, output: string | null;

        switch (interaction.options.getSubcommand()) {
            case ReplyOperation.ADD:
                input = interaction.options.get('input')?.value as string;
                output = interaction.options.get('output')?.value as string;
                replyCommandService.add(input, output);
                break;

            case ReplyOperation.EDIT:
                input = interaction.options.get('input')?.value as string;
                output = interaction.options.get('output')?.value as string;
                replyCommandService.edit(input, output);
                break;

            case ReplyOperation.REMOVE:
                input = interaction.options.get('input')?.value as string;
                replyCommandService.remove(input);
                break;
                
            case ReplyOperation.SEARCH:
                input = interaction.options.get('input')?.value as string;
                replyCommandService.search(input);
                break;

            case ReplyOperation.LIST:
                replyCommandService.list();
                break;

            default:
                // TODO: add error type
                throw new Error('')
        }
    }
}