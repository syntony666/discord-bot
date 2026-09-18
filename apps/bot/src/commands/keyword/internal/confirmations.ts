import { Bot } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createConfirmation } from 'shared/confirmation/confirmation.helper';
import { replySuccess, replyWarning, replyInfo } from 'shared/message/message.helper';
import { ButtonStyles, Timeouts } from '@core/config/constants';
import type { OverwriteData, DeleteData } from '../keyword.types';

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

export async function createOverwriteConfirmation(
  bot: Bot,
  interaction: BotInteraction,
  data: OverwriteData,
  onConfirm: (bot: Bot, interaction: BotInteraction, data: OverwriteData) => Promise<void>
): Promise<void> {
  await createConfirmation<OverwriteData>(
    bot,
    interaction,
    {
      confirmationType: 'keyword_overwrite',
      userId: data.editorId,
      guildId: data.guildId,
      data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: '⚠️ 確認覆寫關鍵字',
        description: `關鍵字 \`${data.pattern}\` 已存在。是否要覆寫？`,
        fields: [
          {
            name: '目前設定',
            value: `**回覆**: ${data.existingRule.response}\n**比對類型**: ${data.existingRule.matchType}`,
            inline: false,
          },
          {
            name: '新設定',
            value: `**回覆**: ${data.response}\n**比對類型**: ${data.matchType}`,
            inline: false,
          },
        ],
      },
      buttons: {
        confirmLabel: '確認覆寫',
        confirmStyle: ButtonStyles.DANGER,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}

export async function createDeleteConfirmation(
  bot: Bot,
  interaction: BotInteraction,
  data: DeleteData,
  onConfirm: (bot: Bot, interaction: BotInteraction, data: DeleteData) => Promise<void>
): Promise<void> {
  await createConfirmation<DeleteData>(
    bot,
    interaction,
    {
      confirmationType: 'keyword_delete',
      userId: data.editorId,
      guildId: data.guildId,
      data,
      expiresIn: Timeouts.CONFIRMATION_MS,
      embed: {
        title: '⚠️ 確認刪除關鍵字',
        description: `即將刪除關鍵字 \`${data.pattern}\`，此操作無法復原。`,
        fields: [
          {
            name: '關鍵字資訊',
            value: `**回覆**: ${data.ruleToDelete.response}\n**比對類型**: ${data.ruleToDelete.matchType}`,
            inline: false,
          },
        ],
      },
      buttons: {
        confirmLabel: '確認刪除',
        confirmStyle: ButtonStyles.DANGER,
        cancelLabel: '取消',
        cancelStyle: ButtonStyles.SECONDARY,
      },
    },
    {
      onConfirm,
      onCancel: defaultCancelHandler,
    }
  );
}
