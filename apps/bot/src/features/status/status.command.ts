import { defineCommand } from '@discord-bot/discord-client';

export const statusCommand = defineCommand()({
  command: 'status',
  description: '顯示狀態資訊',
  guildOnly: true,
  subcommands: [
    { name: 'bot', description: '顯示機器人狀態資訊' },
    { name: 'guild', description: '顯示伺服器資訊' },
    { name: 'notify', description: '顯示所有通知功能設定' },
  ],
});
