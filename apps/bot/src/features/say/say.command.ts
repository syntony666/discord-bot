import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

export const sayCommand = defineCommand({
  command: 'say',
  description: '讓機器人發送訊息',
  default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  guildOnly: true,
  options: [
    {
      name: 'message',
      type: ApplicationCommandOptionType.String,
      description: '訊息內容（可用 \\n 換行）',
      required: true,
      max_length: 4000,
    },
    {
      name: 'title',
      type: ApplicationCommandOptionType.String,
      description: '標題',
      max_length: 256,
    },
  ],
});
