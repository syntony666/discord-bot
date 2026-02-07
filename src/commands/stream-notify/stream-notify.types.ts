import type { InteractionDataOption } from '@discordeno/bot';
import { StreamPlatform } from '@prisma-client/client';

export interface StreamNotifyCommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  subCommand: InteractionDataOption;
}

export interface EnableCommandOptions {
  channel: string;
  message?: string;
}

export interface WatchCommandOptions {
  platform: 'twitch' | 'youtube';
  id: string;
  name?: string;
}

export interface UnwatchCommandOptions {
  platform: 'twitch' | 'youtube';
  id: string;
}
