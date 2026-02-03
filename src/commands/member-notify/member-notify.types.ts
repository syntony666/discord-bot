import type { InteractionDataOption } from '@discordeno/bot';
import type { NotificationChannel } from '@prisma-client/client';

/**
 * Command execution context
 */
export interface CommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  guildModule?: any;
  service?: any;
  subCommand: InteractionDataOption;
}

/**
 * Data structure for member notify disable confirmation
 */
export interface MemberNotifyDisableData {
  guildId: string;
  channels: NotificationChannel[];
}

/**
 * Data structure for setup confirmation
 */
export interface SetupData {
  guildId: string;
  channelId: string;
  userId: string;
}

/**
 * Data structure for message template update
 */
export interface MessageTemplateData {
  guildId: string;
  type: 'join' | 'leave';
  template: string;
  userId: string;
}

/**
 * Data structure for toggle confirmation
 */
export interface ToggleData {
  guildId: string;
  type: 'join' | 'leave';
  enabled: boolean;
  userId: string;
}
