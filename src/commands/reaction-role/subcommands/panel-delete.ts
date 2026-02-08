import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replyError, replyWarning, replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError, DiscordErrorHandler } from 'shared/error';
import { getMessageUrl, channelMention } from 'shared/utils/discord.utils';
import { getModeText } from '../reaction-role.helpers';
import type { PanelMode } from '../reaction-role.types';
import type { PanelDeleteData } from '../reaction-role.types';
import { CustomIdPrefixes } from '@core/config/constants';
import { deleteDiscordMessage } from '../internal/operations';
import { createStandardConfirmation } from '../internal/confirmations';

const log = createLogger('ReactionRolePanel');

export async function handlePanelDelete(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subCommand: InteractionDataOption
) {
  const panelId = subCommand.options?.find((o) => o.name === 'panel_id')?.value as string;
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

    const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));
    const messageUrl = getMessageUrl(guildId, panel.channelId, panelId);

    await createStandardConfirmation<PanelDeleteData>(
      bot,
      CustomIdPrefixes.REACTION_ROLE_PANEL_DELETE,
      {
        interaction,
        userId,
        guildId,
        data: { guildId, panelId, panel, rolesCount: roles.length },
        buttonStyle: 'danger',
        embed: {
          title: '⚠️ 確認刪除 Panel',
          description: `即將刪除 Panel 及其所有 Reaction Roles，此操作無法復原。`,
          fields: [
            {
              name: 'Panel 資訊',
              value: [
                `**標題**: ${panel.title}`,
                `**ID**: \`${panelId}\``,
                `**頻道**: ${channelMention(panel.channelId)}`,
                `**模式**: ${getModeText(panel.mode as PanelMode)}`,
                `**身分組數量**: ${roles.length} 個`,
                `[跳轉至訊息](${messageUrl})`,
              ].join('\n'),
            },
          ],
        },
        onConfirm: async (bot, interaction, data) => {
          try {
            // Step 1: Delete Discord message
            await deleteDiscordMessage(bot, data.panel.channelId, data.panelId, {
              guildId: data.guildId,
              panelId: data.panelId,
            });

            // Step 2: Delete database record
            await lastValueFrom(module.deletePanel$(data.guildId, data.panelId));
            log.debug({ guildId: data.guildId, panelId: data.panelId }, 'Database panel deleted');

            await replyWarning(bot, interaction, {
              title: 'Panel 已刪除',
              description: `Panel \`${data.panelId}\` 及其 ${data.rolesCount} 個 Reaction Roles 已全部刪除。`,
              isEdit: true,
            });

            log.info(
              { guildId: data.guildId, panelId: data.panelId, rolesCount: data.rolesCount },
              'Panel deleted successfully'
            );
          } catch (error) {
            const result = DiscordErrorHandler.handle(error, {
              operation: 'reactionRolePanelDelete',
              guildId: data.guildId,
              panelId: data.panelId,
            });

            if (result.handled && result.userMessage) {
              await replyError(bot, interaction, {
                title: '刪除 Panel 失敗',
                description: result.userMessage,
                isEdit: true,
              });
            } else {
              await handleError(bot, interaction, error, 'reactionRolePanelDelete');
            }
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyInfo(bot, interaction, {
            title: '已取消',
            description: `已取消刪除 Panel \`${data.panelId}\`。`,
            isEdit: true,
          });
        },
      }
    );

    log.info({ guildId, panelId }, 'Panel delete confirmation requested');
  } catch (error) {
    log.error({ error, guildId, panelId }, 'Failed to prepare panel delete confirmation');
    await handleError(bot, interaction, error, 'reactionRolePanelDelete');
  }
}
