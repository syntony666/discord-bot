import type { APIEmbed } from 'discord-api-types/v10';
import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';

export interface ConfirmationConfig<TData = any> {
  confirmationType: string;
  userId: string;
  guildId: string;
  data: TData;
  expiresIn?: number;
  embed: ConfirmationEmbed;
  buttons?: ConfirmationButtons;
}

export interface ConfirmationEmbed extends Omit<APIEmbed, 'type' | 'timestamp' | 'footer'> {
  title: string;
  description: string;
  footerText?: string;
}

export interface ConfirmationButtons {
  confirmLabel?: string;
  confirmStyle?: number;
  cancelLabel?: string;
  cancelStyle?: number;
}

export interface ConfirmationHandler<TData = any> {
  onConfirm: (actions: DiscordActions, interaction: BotInteraction, data: TData) => Promise<void>;
  onCancel?: (actions: DiscordActions, interaction: BotInteraction, data: TData) => Promise<void>;
  onExpire?: (confirmationId: string, data: TData) => void;
}

export interface StoredConfirmation<TData = any> {
  confirmationType: string;
  userId: string;
  guildId: string;
  data: TData;
  expiresAt: number;
  handler: ConfirmationHandler<TData>;
}
