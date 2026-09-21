import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const platformOption = {
  name: 'platform',
  type: ApplicationCommandOptionType.String,
  description: '選擇平台',
  required: true,
  choices: [{ name: 'Twitch', value: 'twitch' }],
} as const;

export const streamNotifyCommand = defineCommand()({
  command: 'stream-notify',
  description: '直播通知系統',
  default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  guildOnly: true,
  subcommands: [
    {
      name: 'enable',
      description: '啟用直播通知功能',
      options: [
        {
          name: 'channel',
          type: ApplicationCommandOptionType.Channel,
          description: '選擇要發送通知的頻道',
          required: true,
          channel_types: [ChannelType.GuildText],
        },
        {
          name: 'message',
          type: ApplicationCommandOptionType.String,
          description: '自訂通知訊息（可用 {user} 代表實況主名稱）',
          max_length: 1000,
        },
      ],
    },
    { name: 'disable', description: '停用直播通知功能' },
    {
      name: 'watch',
      description: '新增實況頻道監控',
      options: [
        platformOption,
        {
          name: 'id',
          type: ApplicationCommandOptionType.String,
          description: '實況主 ID 或用戶名',
          required: true,
        },
        {
          name: 'name',
          type: ApplicationCommandOptionType.String,
          description: '顯示名稱（預設為 ID）',
          max_length: 100,
        },
      ],
    },
    {
      name: 'unwatch',
      description: '移除實況頻道監控',
      options: [
        platformOption,
        {
          name: 'id',
          type: ApplicationCommandOptionType.String,
          description: '實況主 ID 或用戶名',
          required: true,
        },
      ],
    },
    { name: 'list', description: '顯示目前的直播通知設定' },
  ],
});
