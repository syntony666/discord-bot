import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const panelIdOption = {
  name: 'panel_id',
  type: ApplicationCommandOptionType.String,
  description: 'Panel 訊息的 ID',
  required: true,
} as const;

export const reactionRoleCommand = defineCommand()({
  command: 'reaction-role',
  description: '管理反應身分組',
  default_member_permissions: String(PermissionFlagsBits.ManageRoles),
  guildOnly: true,
  subcommands: [
    {
      name: 'add',
      description: '為 Panel 添加 Reaction Role',
      options: [
        panelIdOption,
        {
          name: 'emoji',
          type: ApplicationCommandOptionType.String,
          description: '要使用的 emoji（直接貼上 emoji 或自訂表情符號）',
          required: true,
        },
        {
          name: 'role',
          type: ApplicationCommandOptionType.Role,
          description: '要給予的身分組',
          required: true,
        },
        {
          name: 'description',
          type: ApplicationCommandOptionType.String,
          description: '身分組說明（選填）',
          max_length: 100,
        },
      ],
    },
    {
      name: 'remove',
      description: '移除 Reaction Role',
      options: [
        panelIdOption,
        {
          name: 'emoji',
          type: ApplicationCommandOptionType.String,
          description: '要移除的 emoji',
          required: true,
        },
      ],
    },
    {
      name: 'role-list',
      description: '列出 Panel 的所有 Reaction Roles',
      options: [panelIdOption],
    },
  ],
  groups: [
    {
      name: 'panel',
      description: '管理 Reaction Role Panel',
      subcommands: [
        {
          name: 'create',
          description: '建立新的 Reaction Role Panel',
          options: [
            {
              name: 'channel',
              type: ApplicationCommandOptionType.Channel,
              description: '選擇要發送 panel 的頻道',
              required: true,
              channel_types: [ChannelType.GuildText],
            },
            {
              name: 'title',
              type: ApplicationCommandOptionType.String,
              description: 'Panel 標題',
              max_length: 256,
            },
            {
              name: 'description',
              type: ApplicationCommandOptionType.String,
              description: 'Panel 說明文字',
              max_length: 2048,
            },
            {
              name: 'mode',
              type: ApplicationCommandOptionType.String,
              description: '選擇模式',
              choices: [
                { name: 'NORMAL - 可以選多個身分組', value: 'NORMAL' },
                { name: 'UNIQUE - 只能選一個身分組', value: 'UNIQUE' },
                { name: 'VERIFY - 驗證模式（給予後移除反應）', value: 'VERIFY' },
              ],
            },
          ],
        },
        { name: 'list', description: '列出所有 Reaction Role Panels' },
        {
          name: 'delete',
          description: '刪除 Reaction Role Panel',
          options: [
            {
              name: 'panel_id',
              type: ApplicationCommandOptionType.String,
              description: 'Panel 訊息的 ID（從 panel footer 複製）',
              required: true,
            },
          ],
        },
        {
          name: 'edit',
          description: '編輯 Panel 設定',
          options: [
            panelIdOption,
            {
              name: 'title',
              type: ApplicationCommandOptionType.String,
              description: '新的標題',
              max_length: 256,
            },
            {
              name: 'description',
              type: ApplicationCommandOptionType.String,
              description: '新的說明文字',
              max_length: 2048,
            },
            {
              name: 'mode',
              type: ApplicationCommandOptionType.String,
              description: '新的模式',
              choices: [
                { name: 'NORMAL - 可以選多個身分組 (多選模式)', value: 'NORMAL' },
                { name: 'UNIQUE - 只能選一個身分組 (單選模式)', value: 'UNIQUE' },
                { name: 'VERIFY - 驗證模式', value: 'VERIFY' },
              ],
            },
          ],
        },
      ],
    },
  ],
});
