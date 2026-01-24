import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyError,
  replyInfo,
  replyWarning,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction, BotMessage } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from '@adapters/discord/shared/error';
import { channelMention, getMessageUrl } from '@adapters/discord/shared/utils/discord.utils';
import { buildPanelEmbed, getModeText } from './panel.helper';
import type { PanelMode } from '../reaction-role.types';
import { CustomIdPrefixes } from '@core/config/constants';
import { PanelDeleteData, PanelEditData } from './panel.types';
import { deleteDiscordMessage, updatePanelMessage, sanitizeUpdates } from '../shared/operations';
import { createStandardConfirmation } from '../shared/confirmations';

const log = createLogger('ReactionRolePanel');

/**
 * Route panel subcommands to appropriate handlers.
 */
export async function handlePanelCommands(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const subCommand = subGroup.options?.[0] as InteractionDataOption;
  const subCommandName = subCommand?.name;

  if (subCommandName === 'create') {
    await handlePanelCreate(bot, interaction, module, guildId, subCommand);
  } else if (subCommandName === 'list') {
    await handlePanelList(bot, interaction, module, guildId);
  } else if (subCommandName === 'delete') {
    await handlePanelDelete(bot, interaction, module, guildId, subCommand);
  } else if (subCommandName === 'edit') {
    await handlePanelEdit(bot, interaction, module, guildId, subCommand);
  }
}

/**
 * Handle /reaction-role panel create
 */
async function handlePanelCreate(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subCommand: InteractionDataOption
) {
  const channelId = subCommand.options?.find((o) => o.name === 'channel')?.value as string;
  const title = (subCommand.options?.find((o) => o.name === 'title')?.value as string) || undefined;
  const description =
    (subCommand.options?.find((o) => o.name === 'description')?.value as string) || undefined;
  const mode = (subCommand.options?.find((o) => o.name === 'mode')?.value as PanelMode) || 'NORMAL';

  try {
    // Step 1: Send Discord message
    const message = (await bot.helpers.sendMessage(
      BigInt(channelId),
      buildPanelEmbed({
        title,
        description,
        mode,
        roles: [],
      })
    )) as BotMessage;

    // Step 2: Update message with panel ID
    await bot.helpers.editMessage(
      BigInt(channelId),
      message.id,
      buildPanelEmbed({
        title,
        description,
        mode,
        roles: [],
        messageId: message.id.toString(),
      })
    );

    // Step 3: Create database record
    await lastValueFrom(
      module.createPanel$({
        guildId,
        channelId,
        messageId: message.id.toString(),
        title,
        description,
        mode,
      })
    );

    await replySuccess(bot, interaction, {
      title: 'Panel 已建立',
      description: `Reaction Role Panel 已在 ${channelMention(channelId)} 建立。\n\n**Panel ID**: \`${message.id}\`\n\n使用 \`/reaction-role add\` 來添加身分組。`,
    });

    log.info({ guildId, channelId, messageId: message.id.toString() }, 'Panel created');
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to create panel');
    await handleError(bot, interaction, error, 'reactionRolePanelCreate');
  }
}

/**
 * Handle /reaction-role panel list
 */
async function handlePanelList(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string
) {
  try {
    const panels = await lastValueFrom(module.getPanelsByGuild$(guildId));

    if (panels.length === 0) {
      await replyInfo(bot, interaction, {
        title: 'Panel 列表',
        description:
          '目前沒有任何 Reaction Role Panel。\n使用 `/reaction-role panel create` 建立新的 Panel。',
      });
      return;
    }

    const description = await Promise.all(
      panels.map(async (panel) => {
        const roles = await lastValueFrom(
          module.getReactionRolesByMessage$(guildId, panel.messageId)
        );
        const modeText = getModeText(panel.mode as PanelMode);
        const messageUrl = getMessageUrl(guildId, panel.channelId, panel.messageId);

        return [
          `**${panel.title}**`,
          `ID: \`${panel.messageId}\``,
          `頻道: ${channelMention(panel.channelId)}`,
          `模式: ${modeText}`,
          `身分組數量: ${roles.length} 個`,
          `[跳轉至訊息](${messageUrl})`,
          '',
        ].join('\n');
      })
    );

    await replyInfo(bot, interaction, {
      title: `Panel 列表 (${panels.length} 個)`,
      description: description.join('\n'),
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to list panels');
    await handleError(bot, interaction, error, 'reactionRolePanelList');
  }
}

/**
 * Handle /reaction-role panel delete
 */
async function handlePanelDelete(
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
            log.error(
              { error, guildId: data.guildId, panelId: data.panelId },
              'Failed to delete panel'
            );
            await handleError(bot, interaction, error, 'reactionRolePanelDelete');
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

/**
 * Handle /reaction-role panel edit
 */
async function handlePanelEdit(
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
            log.error(
              { error, guildId: data.guildId, panelId: data.panelId },
              'Failed to edit panel'
            );
            await handleError(bot, interaction, error, 'reactionRolePanelEdit');
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
