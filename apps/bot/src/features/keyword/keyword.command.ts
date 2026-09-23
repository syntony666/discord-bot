import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

const matchTypeOption = {
  name: 'match_type',
  type: ApplicationCommandOptionType.String,
  description: '比對類型（預設：EXACT 精確比對）',
  choices: [
    { name: 'EXACT - 精確比對', value: 'EXACT' },
    { name: 'CONTAINS - 包含比對', value: 'CONTAINS' },
  ],
} as const;

export const keywordCommand = defineCommand()({
  command: 'keyword',
  description: '管理關鍵字自動回覆',
  guildOnly: true,
  subcommands: [
    {
      name: 'add',
      description: '新增關鍵字回覆規則',
      options: [
        {
          name: 'pattern',
          type: ApplicationCommandOptionType.String,
          description: '關鍵字文字',
          required: true,
        },
        {
          name: 'response',
          type: ApplicationCommandOptionType.String,
          description: '回覆內容',
          required: true,
        },
        matchTypeOption,
      ],
    },
    {
      name: 'edit',
      description: '編輯關鍵字規則',
      options: [
        {
          name: 'pattern',
          type: ApplicationCommandOptionType.String,
          description: '要編輯的關鍵字文字',
          required: true,
        },
        {
          name: 'response',
          type: ApplicationCommandOptionType.String,
          description: '新的回覆內容',
          required: true,
        },
        matchTypeOption,
      ],
    },
    { name: 'list', description: '列出所有關鍵字規則' },
    {
      name: 'search',
      description: '搜尋關鍵字規則',
      options: [
        {
          name: 'query',
          type: ApplicationCommandOptionType.String,
          description: '搜尋的關鍵字文字',
          required: true,
        },
      ],
    },
    {
      name: 'delete',
      description: '刪除關鍵字規則',
      options: [
        {
          name: 'pattern',
          type: ApplicationCommandOptionType.String,
          description: '要刪除的關鍵字文字',
          required: true,
        },
      ],
    },
  ],
});
