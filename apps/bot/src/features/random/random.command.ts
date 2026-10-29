import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { defineCommand } from '@discord-bot/discord-client';

export const randomCommand = defineCommand({
  command: 'random',
  description: '隨機功能',
  guildOnly: true,
  subcommands: [
    {
      name: 'pick',
      description: '從選項中隨機挑選一個',
      options: [
        {
          name: 'options',
          type: ApplicationCommandOptionType.String,
          description: '選項清單（以 , 、 ， 、 ; 、 、 、 ； 分隔）',
          required: true,
        },
      ],
    },
    {
      name: 'roll',
      description: '擲骰子（預設：1d6）',
      options: [
        {
          name: 'expr',
          type: ApplicationCommandOptionType.String,
          description: '骰子格式 NdM，可加 kh/dh/kl/dl 修飾（例：4d6kh3）',
        },
      ],
    },
    {
      name: 'number',
      description: '隨機產生一個整數（預設：1-100）',
      options: [
        {
          name: 'min',
          type: ApplicationCommandOptionType.Integer,
          description: '最小值（預設：1）',
        },
        {
          name: 'max',
          type: ApplicationCommandOptionType.Integer,
          description: '最大值（預設：100）',
        },
      ],
    },
  ],
});
