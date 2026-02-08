import type { InteractionDataOption } from '@discordeno/bot';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';
import type { StreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { StreamPlatform } from '@prisma-client/client';

export interface StreamNotifyCommandContext {
  bot: Bot;
  interaction: BotInteraction;
  guildId: string;
  module: StreamNotifyModule;
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
