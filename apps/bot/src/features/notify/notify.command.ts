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
  ],
});
