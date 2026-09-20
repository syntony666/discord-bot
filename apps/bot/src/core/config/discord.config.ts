import { GatewayIntentBits } from 'discord-api-types/v10';

export const botIntents =
  GatewayIntentBits.Guilds |
  GatewayIntentBits.GuildMessages |
  GatewayIntentBits.GuildMembers |
  GatewayIntentBits.MessageContent |
  GatewayIntentBits.GuildMessageReactions;
