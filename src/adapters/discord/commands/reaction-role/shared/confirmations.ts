import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createConfirmation } from '@adapters/discord/shared/confirmation/confirmation.helper';
import { ButtonStyles, Timeouts } from '@core/config/constants';
import { replyInfo } from '@adapters/discord/shared/message/message.helper';

export interface ConfirmationEmbedData {
  title: string;
  description: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface ConfirmationOptions<T> {
  interaction: BotInteraction;
  userId: string;
  guildId: string;
  data: T;
  embed: ConfirmationEmbedData;
  buttonStyle: 'danger' | 'primary';
  confirmLabel?: string;
  onConfirm: (bot: Bot, interaction: BotInteraction, data: T) => Promise<void>;
  onCancel?: (bot: Bot, interaction: BotInteraction, data: T) => Promise<void>;
}

/**
 * Default cancel handler for confirmations
 */
async function defaultCancelHandler(
  bot: Bot,
  interaction: BotInteraction,
  data: any
): Promise<void> {
  await replyInfo(bot, interaction, {
    title: '已取消',
    description: '操作已取消。',
    isEdit: true,
  });
}

/**
 * Create standardized confirmation dialog
 */
export async function createStandardConfirmation<T>(
  bot: Bot,
  confirmationType: string,
  options: ConfirmationOptions<T>
): Promise<void> {
  const confirmStyle =
    options.buttonStyle === 'danger' ? ButtonStyles.DANGER : ButtonStyles.PRIMARY;
  const defaultConfirmLabel = options.buttonStyle === 'danger' ? '確認刪除' : '確認';

  await createConfirmation<T>(
    bot,
    options.interaction,
    {
      confirmationType,
      userId: options.userId,
      guildId: options.guildId,
      data: options.data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: options.embed.title,
        description: options.embed.description,
        fields: options.embed.fields,
      },
      buttons: {
        confirmLabel: options.confirmLabel || defaultConfirmLabel,
        confirmStyle: confirmStyle,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || defaultCancelHandler,
    }
  );
}
