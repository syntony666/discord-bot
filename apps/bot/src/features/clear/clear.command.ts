import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

export const clearCommand = defineCommand({
  command: 'clear',
  description: '批次刪除訊息',
  default_member_permissions: String(PermissionFlagsBits.ManageMessages),
  guildOnly: true,
  subcommands: [
    {
      name: 'count',
      description: '刪除最近的 N 則訊息',
      options: [
        {
          name: 'count',
          type: ApplicationCommandOptionType.Integer,
          description: '要刪除的訊息數量',
          required: true,
          min_value: 1,
          max_value: 100,
        },
      ],
    },
    {
      name: 'time',
      description: '刪除最近一段時間內的訊息',
      options: [
        {
          name: 'minutes',
          type: ApplicationCommandOptionType.Integer,
          description: '往前推算的分鐘數',
          required: true,
          min_value: 1,
          max_value: 1440,
        },
      ],
    },
  ],
});
