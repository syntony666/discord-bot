import { PermissionFlagsBits } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

export const autoCommand = defineCommand({
  command: 'auto',
  description: '自動化功能設定',
  default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  guildOnly: true,
  groups: [
    {
      name: 'linkfix',
      description: '自動修復社群連結預覽',
      subcommands: [
        { name: 'enable', description: '啟用連結修復' },
        { name: 'disable', description: '停用連結修復' },
        { name: 'status', description: '查看連結修復狀態' },
      ],
    },
  ],
});
