import { SlashCommandBuilder, } from "discord.js";
import { Command } from "./command";
import { StatusCommandService, StatusOperation } from "./statusCommand.sevice";

export const StatusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('取得相關資訊')
        .addSubcommand(subcommand => {
            return subcommand
                .setName('bot')
                .setDescription('取得機器人資訊')
        })
        .addSubcommand(subcommand => {
            return subcommand
                .setName('server')
                .setDescription('取得伺服器資訊')
        }),
    execute: async (interaction) => {
        let type: StatusOperation;

        switch (interaction.options.getSubcommand()) {
            case 'bot':
                type = StatusOperation.BOT;
                break;
            case 'server':
                type = StatusOperation.SERVER;
                break;
            default:
                type = StatusOperation.UNDEFINED;
                break;
        }

        const statusCommandService = new StatusCommandService(interaction);

        switch (type) {
            case StatusOperation.BOT:
                statusCommandService.bot();
                break;

            case StatusOperation.SERVER:
                statusCommandService.server();
                break;

            case StatusOperation.UNDEFINED:
            default:
                // TODO: add error type
                throw new Error('')
        }
    }
}