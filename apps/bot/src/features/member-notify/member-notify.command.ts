import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const templateOption = {
  name: 'template',
  type: ApplicationCommandOptionType.String,
  description: '訊息模板 (可用變數: {user}, {username}, {server}, {memberCount})',
  required: true,
} as const;

const enabledOption = {
  name: 'enabled',
  type: ApplicationCommandOptionType.Boolean,
  description: '是否啟用',
  required: true,
} as const;

export const memberNotifyCommand = defineCommand()({
  command: 'member-notify',
  description: '設定成員進出通知',
  default_member_permissions: String(PermissionFlagsBits.ManageGuild),
  subcommands: [
    {
      name: 'enable',
      description: '啟用成員進出通知',
      options: [
        {
          name: 'channel',
          type: ApplicationCommandOptionType.Channel,
          description: '選擇通知頻道',
          required: true,
          channel_types: [ChannelType.GuildText],
        },
      ],
    },
    { name: 'disable', description: '關閉成員進出通知' },
    { name: 'status', description: '查看當前設定' },
    {
      name: 'test',
      description: '測試當前訊息格式',
      options: [
        {
          name: 'type',
          type: ApplicationCommandOptionType.String,
          description: '測試類型',
          required: true,
          choices: [
            { name: '加入訊息', value: 'join' },
            { name: '離開訊息', value: 'leave' },
          ],
        },
      ],
    },
  ],
  groups: [
    {
      name: 'message',
      description: '設定訊息模板',
      subcommands: [
        { name: 'join', description: '設定加入訊息模板', options: [templateOption] },
        { name: 'leave', description: '設定離開訊息模板', options: [templateOption] },
      ],
    },
    {
      name: 'toggle',
      description: '開關特定通知',
      subcommands: [
        { name: 'join', description: '開關加入通知', options: [enabledOption] },
        { name: 'leave', description: '開關離開通知', options: [enabledOption] },
      ],
    },
  ],
});
