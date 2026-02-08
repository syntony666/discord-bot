import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replyError, replySuccess, replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError, DiscordErrorHandler } from 'shared/error';
import { getMessageUrl } from 'shared/utils/discord.utils';
import { getModeText } from '../reaction-role.helpers';
import type { PanelMode } from '../reaction-role.types';
import type { PanelEditData } from '../reaction-role.types';
import { CustomIdPrefixes } from '@core/config/constants';
import { updatePanelMessage, sanitizeUpdates } from '../internal/operations';
import { createStandardConfirmation } from '../internal/confirmations';

const log = createLogger('ReactionRolePanel');

export async function handlePanelEdit(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subCommand: InteractionDataOption
) {
  const panelId = subCommand.options?.find((o) => o.name === 'panel_id')?.value as string;
  const title = (subCommand.options?.find((o) => o.name === 'title')?.value as string) || undefined;
  const description = subCommand.options?.find((o) => o.name === 'description')?.value as
    | string
    | undefined;
  const mode =
    (subCommand.options?.find((o) => o.name === 'mode')?.value as PanelMode) || undefined;
  const userId = interaction.user?.id?.toString() || '';

  try {
    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
      });
      return;
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (mode !== undefined) updates.mode = mode;

    const messageUrl = getMessageUrl(guildId, panel.channelId, panelId);

    // Build comparison fields
    const currentFields: string[] = [];
    const newFields: string[] = [];

    if (title !== undefined) {
      currentFields.push(`**標題**: ${panel.title}`);
      newFields.push(`**標題**: ${title}`);
    }

    if (description !== undefined) {
      currentFields.push(`**說明**: ${panel.description || '*(無)*'}`);
      newFields.push(`**說明**: ${description || '*(無)*'}`);
    }

    if (mode !== undefined) {
      currentFields.push(`**模式**: ${getModeText(panel.mode as PanelMode)}`);
      newFields.push(`**模式**: ${getModeText(mode)}`);
    }

    await createStandardConfirmation<PanelEditData>(
      bot,
      CustomIdPrefixes.REACTION_ROLE_PANEL_EDIT,
      {
        interaction,
        userId,
        guildId,
        data: { guildId, panelId, panel, updates },
        buttonStyle: 'primary',
        confirmLabel: '確認更新',
        embed: {
          title: '📝 確認更新 Panel',
          description: `即將更新 Panel 設定。\n[跳轉至訊息](${messageUrl})`,
          fields: [
            {
              name: '目前設定',
              value: currentFields.join('\n'),
              inline: true,
            },
            {
              name: '新的設定',
              value: newFields.join('\n'),
              inline: true,
            },
          ],
        },
        onConfirm: async (bot, interaction, data) => {
          try {
            const roles = await lastValueFrom(
              module.getReactionRolesByMessage$(data.guildId, data.panelId)
            );

            // Step 1: Update Discord message
            await updatePanelMessage(bot, data.panel, roles, data.updates);

            // Step 2: Update database record (sanitize null to undefined)
            const sanitizedUpdates = sanitizeUpdates(data.updates);
            await lastValueFrom(module.updatePanel$(data.guildId, data.panelId, sanitizedUpdates));
            log.debug({ guildId: data.guildId, panelId: data.panelId }, 'Database panel updated');

            await replySuccess(bot, interaction, {
              title: 'Panel 已更新',
              description: `Panel \`${data.panelId}\` 已成功更新。`,
              isEdit: true,
            });

            log.info(
              { guildId: data.guildId, panelId: data.panelId, updates: data.updates },
              'Panel edited successfully'
            );
          } catch (error) {
            const result = DiscordErrorHandler.handle(error, {
              operation: 'reactionRolePanelEdit',
              guildId: data.guildId,
              panelId: data.panelId,
            });

            if (result.handled && result.userMessage) {
              await replyError(bot, interaction, {
                title: '更新 Panel 失敗',
                description: result.userMessage,
                isEdit: true,
              });
            } else {
              await handleError(bot, interaction, error, 'reactionRolePanelEdit');
            }
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyInfo(bot, interaction, {
            title: '已取消',
            description: `已取消更新 Panel \`${data.panelId}\`。`,
            isEdit: true,
          });
        },
      }
    );

    log.info({ guildId, panelId, updates }, 'Panel edit confirmation requested');
  } catch (error) {
    log.error({ error, guildId, panelId }, 'Failed to prepare panel edit confirmation');
    await handleError(bot, interaction, error, 'reactionRolePanelEdit');
  }
}
