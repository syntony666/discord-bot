import { Bot, DiscordEmbed } from '@discordeno/bot';
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

/**
 * Confirmation embed options extending DiscordEmbed.
 */
export interface ConfirmationEmbed extends Omit<DiscordEmbed, 'type' | 'timestamp' | 'footer'> {
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
  onConfirm: (bot: Bot, interaction: BotInteraction, data: TData) => Promise<void>;
  onCancel?: (bot: Bot, interaction: BotInteraction, data: TData) => Promise<void>;
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
