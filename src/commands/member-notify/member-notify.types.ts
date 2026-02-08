import type { InteractionDataOption } from '@discordeno/bot';
import type { NotificationChannel } from '@prisma-client/client';

export interface CommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  guildModule?: any;
  service?: any;
  subCommand: InteractionDataOption;
}

export interface MemberNotifyDisableData {
  guildId: string;
  channels: NotificationChannel[];
}

export interface SetupData {
  guildId: string;
  channelId: string;
  userId: string;
}

export interface MessageTemplateData {
  guildId: string;
  type: 'join' | 'leave';
  template: string;
  userId: string;
}

export interface ToggleData {
  guildId: string;
  type: 'join' | 'leave';
  enabled: boolean;
  userId: string;
}
