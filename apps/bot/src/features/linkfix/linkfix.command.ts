import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

export const linkfixCommand = defineCommand({
  command: 'linkfix',
  description: '清理連結（展開短網址、移除追蹤參數、修復預覽）',
  guildOnly: true,
  options: [
    {
      name: 'url',
      type: ApplicationCommandOptionType.String,
      description: '要清理的連結',
      required: true,
      max_length: 1000,
    },
  ],
});
