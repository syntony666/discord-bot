import { defineCommand } from '@discord-bot/discord-client';

export const botCommand = defineCommand()({
  command: 'bot',
  description: '機器人管理指令(僅限作者)',
  ownerOnly: true,
  groups: [
    {
      name: 'guild',
      description: '伺服器管理',
      subcommands: [{ name: 'list', description: '列出 bot 所在的所有伺服器' }],
    },
  ],
});
