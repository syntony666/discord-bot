import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';
import { createConfirmation } from 'shared/confirmation/confirmation.helper';
import { Timeouts } from '@core/config/constants';
import { ButtonStyle } from 'discord-api-types/v10';
import { replyInfo } from 'shared/message/message.helper';

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
  onConfirm: (actions: DiscordActions, interaction: BotInteraction, data: T) => Promise<void>;
  onCancel?: (actions: DiscordActions, interaction: BotInteraction, data: T) => Promise<void>;
}

async function defaultCancelHandler(
  actions: DiscordActions,
  interaction: BotInteraction,
  data: any
): Promise<void> {
  await replyInfo(actions, interaction, {
    title: '已取消',
    description: '操作已取消。',
    isEdit: true,
  });
}

export async function createStandardConfirmation<T>(
  actions: DiscordActions,
  confirmationType: string,
  options: ConfirmationOptions<T>
): Promise<void> {
  const confirmStyle =
    options.buttonStyle === 'danger' ? ButtonStyle.Danger : ButtonStyle.Primary;
  const defaultConfirmLabel = options.buttonStyle === 'danger' ? '確認刪除' : '確認';

  await createConfirmation<T>(
    actions,
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
        cancelStyle: ButtonStyle.Secondary,
      },
    },
    {
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || defaultCancelHandler,
    }
  );
}
