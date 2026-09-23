import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const channelOption = {
  name: 'channel',
  type: ApplicationCommandOptionType.Channel,
  description: '選擇通知頻道',
  required: true,
  channel_types: [ChannelType.GuildText],
} as const;

const streamChannelOption = {
  name: 'channel',
  type: ApplicationCommandOptionType.Channel,
  description: '選擇要發送通知的頻道',
  required: true,
  channel_types: [ChannelType.GuildText],
} as const;

const streamMessageOption = {
  name: 'message',
  type: ApplicationCommandOptionType.String,
  description: '自訂通知訊息（可用 {user} 代表實況主名稱）',
  max_length: 1000,
} as const;

const platformOption = {
  name: 'platform',
  type: ApplicationCommandOptionType.String,
  description: '選擇平台',
  required: true,
  choices: [{ name: 'Twitch', value: 'twitch' }],
} as const;

const streamerIdOption = {
  name: 'id',
  type: ApplicationCommandOptionType.String,
  description: '實況主 ID 或用戶名',
  required: true,
} as const;

const typeOption = {
  name: 'type',
  type: ApplicationCommandOptionType.String,
  description: '測試類型',
  required: true,
  choices: [
    { name: '加入訊息', value: 'join' },
    { name: '離開訊息', value: 'leave' },
  ],
} as const;

const templateOption = {
  name: 'template',
  type: ApplicationCommandOptionType.String,
  description: '訊息模板 (可用變數: {user}, {username}, {server}, {memberCount})',
} as const;

const enabledOption = {
  name: 'enabled',
  type: ApplicationCommandOptionType.Boolean,
  description: '是否啟用',
} as const;

export const notifyCommand = defineCommand()({
  command: 'notify',
  description: '統一通知設定',
  default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  guildOnly: true,
  groups: [
    {
      name: 'member',
      description: '成員進出通知',
      subcommands: [
        { name: 'enable', description: '啟用成員進出通知', options: [channelOption] },
        { name: 'disable', description: '關閉成員進出通知' },
        { name: 'status', description: '查看當前設定' },
        { name: 'test', description: '測試訊息格式', options: [typeOption] },
        {
          name: 'join',
          description: '查看或設定加入通知',
          options: [templateOption, enabledOption],
        },
        {
          name: 'leave',
          description: '查看或設定離開通知',
          options: [templateOption, enabledOption],
        },
      ],
    },
    {
      name: 'stream',
      description: '直播通知',
      subcommands: [
        {
          name: 'enable',
          description: '啟用直播通知功能',
          options: [streamChannelOption, streamMessageOption],
        },
        { name: 'disable', description: '停用直播通知功能' },
        {
          name: 'watch',
          description: '新增實況頻道監控',
          options: [
            platformOption,
            streamerIdOption,
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
          options: [platformOption, streamerIdOption],
        },
        { name: 'list', description: '顯示目前的直播通知設定' },
      ],
    },
  ],
});
