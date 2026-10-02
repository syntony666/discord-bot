import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const guildIdOption = {
  name: 'guild_id',
  type: ApplicationCommandOptionType.String,
  description: '伺服器 ID（預設為當前伺服器）',
} as const;

const guildIdRequiredOption = {
  name: 'guild_id',
  type: ApplicationCommandOptionType.String,
  description: '伺服器 ID',
  required: true,
} as const;

export const botCommand = defineCommand()({
  command: 'bot',
  description: '機器人管理指令（僅限作者）',
  ownerOnly: true,
  groups: [
    {
      name: 'guild',
      description: '伺服器管理',
      subcommands: [
        { name: 'list', description: '列出所在的所有伺服器' },
        { name: 'info', description: '查看單一伺服器的詳細資訊', options: [guildIdOption] },
        {
          name: 'tier',
          description: '設定伺服器級別',
          options: [
            {
              name: 'tier',
              type: ApplicationCommandOptionType.String,
              description: '目標級別',
              required: true,
              choices: [
                { name: 'normal', value: 'NORMAL' },
                { name: 'premium', value: 'PREMIUM' },
                { name: 'home', value: 'HOME' },
              ],
            },
            guildIdOption,
          ],
        },
        {
          name: 'leave',
          description: '退出指定伺服器',
          options: [guildIdRequiredOption],
        },
        {
          name: 'sync',
          description: '比對 Discord 實際所在伺服器與資料庫記錄',
        },
      ],
    },
  ],
});
