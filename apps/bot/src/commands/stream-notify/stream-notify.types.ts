import type { CommandOption } from '@core/discord/discord.types';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { BotInteraction } from '@core/rx/bus';
import type { StreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { StreamPlatform } from '@discord-bot/shared';

export interface StreamNotifyCommandContext {
  actions: DiscordActions;
  interaction: BotInteraction;
  guildId: string;
  module: StreamNotifyModule;
  subCommand: CommandOption;
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
