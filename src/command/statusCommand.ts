import { SlashCommandBuilder, } from "discord.js";
import { Command } from "./command";
import { StatusCommandService, StatusOperation } from "./statusCommand.sevice";

export const StatusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('取得相關資訊')
        .addSubcommand(subcommand => {
            return subcommand
                .setName(StatusOperation.BOT)
                .setDescription('取得機器人資訊')
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName(StatusOperation.SERVER)
                .setDescription('取得伺服器資訊')
        }),
    execute: async (interaction) => {
        const statusCommandService = new StatusCommandService(interaction);

        switch (interaction.options.getSubcommand()) {
            case StatusOperation.BOT:
                statusCommandService.bot();
                break;

            case StatusOperation.SERVER:
                statusCommandService.server();
                break;

            default:
                // TODO: add error type
                throw new Error('')
        }
    }
}