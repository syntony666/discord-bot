import { ActivityType, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { UNLIMITED_LIMIT } from '@discord-bot/shared';
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

export const botCommand = defineCommand({
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
    {
      name: 'profile',
      description: '個人檔案設定',
      subcommands: [
        {
          name: 'activity',
          description: '設定活動狀態',
          options: [
            {
              name: 'type',
              type: ApplicationCommandOptionType.Integer,
              description: '活動類型',
              required: true,
              choices: [
                { name: '正在玩', value: ActivityType.Playing },
                { name: '直播中', value: ActivityType.Streaming },
                { name: '正在收聽', value: ActivityType.Listening },
                { name: '正在觀看', value: ActivityType.Watching },
                { name: '自訂', value: ActivityType.Custom },
                { name: '正在比賽', value: ActivityType.Competing },
              ],
            },
            {
              name: 'text',
              type: ApplicationCommandOptionType.String,
              description: '顯示文字',
              required: true,
            },
            {
              name: 'url',
              type: ApplicationCommandOptionType.String,
              description: '直播連結（僅 **直播中** 類型使用）',
            },
          ],
        },
        {
          name: 'about',
          description: '設定關於我',
          options: [
            {
              name: 'text',
              type: ApplicationCommandOptionType.String,
              description: '關於我的內容',
              required: true,
            },
          ],
        },
      ],
    },
  ],
  subcommands: [
    {
      name: 'limit',
      description: '調整級別額度',
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
        {
          name: 'watchers',
          type: ApplicationCommandOptionType.Integer,
          description: '直播監控上限（-1 為無限）',
          min_value: UNLIMITED_LIMIT,
        },
        {
          name: 'keywords',
          type: ApplicationCommandOptionType.Integer,
          description: '關鍵字規則上限（-1 為無限）',
          min_value: UNLIMITED_LIMIT,
        },
        {
          name: 'panels',
          type: ApplicationCommandOptionType.Integer,
          description: '身分組選單上限（-1 為無限）',
          min_value: UNLIMITED_LIMIT,
        },
      ],
    },
    {
      name: 'announce',
      description: '發送公告給各伺服器擁有者',
      options: [
        {
          name: 'message',
          type: ApplicationCommandOptionType.String,
          description: '公告內容',
          required: true,
        },
        {
          name: 'tier',
          type: ApplicationCommandOptionType.String,
          description: '僅發送給指定級別',
          choices: [
            { name: 'normal', value: 'NORMAL' },
            { name: 'premium', value: 'PREMIUM' },
            { name: 'home', value: 'HOME' },
          ],
        },
      ],
    },
    {
      name: 'stats',
      description: '全域統計',
    },
  ],
});
