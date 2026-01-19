import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyError,
  replyInfo,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction, BotMessage } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from '@adapters/discord/shared/error';
import { channelMention, getMessageUrl } from '@adapters/discord/shared/utils/discord.utils';
import { buildPanelEmbed, getModeText } from './panel.helper';
import type { PanelMode } from '../reaction-role.types';

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
    const message = (await bot.helpers.sendMessage(
      BigInt(channelId),
      buildPanelEmbed({
        title,
        description,
        mode,
        roles: [],
      })
    )) as BotMessage;

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

  try {
    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
      });
      return;
    }

    await lastValueFrom(module.deletePanel$(guildId, panelId));

    try {
      await bot.helpers.deleteMessage(BigInt(panel.channelId), BigInt(panelId));
    } catch (error: any) {
      if (error.code !== 10008) throw error;
    }

    await replySuccess(bot, interaction, {
      title: 'Panel 已刪除',
      description: `Panel \`${panelId}\` 及其所有 Reaction Roles 已刪除。`,
    });

    log.info({ guildId, messageId: panelId }, 'Panel deleted');
  } catch (error) {
    log.error({ error, guildId, messageId: panelId }, 'Failed to delete panel');
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
  const description =
    (subCommand.options?.find((o) => o.name === 'description')?.value as string) || undefined;
  const mode =
    (subCommand.options?.find((o) => o.name === 'mode')?.value as PanelMode) || undefined;

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

    const updatedPanel = await lastValueFrom(module.updatePanel$(guildId, panelId, updates));
    const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

    await bot.helpers.editMessage(
      BigInt(panel.channelId),
      BigInt(panelId),
      buildPanelEmbed({
        title: updatedPanel.title,
        description: updatedPanel.description || undefined,
        mode: updatedPanel.mode as PanelMode,
        roles,
        messageId: panelId,
      })
    );

    await replySuccess(bot, interaction, {
      title: 'Panel 已更新',
      description: `Panel \`${panelId}\` 已成功更新。`,
    });

    log.info({ guildId, messageId: panelId, updates }, 'Panel edited');
  } catch (error) {
    log.error({ error, guildId, messageId: panelId }, 'Failed to edit panel');
    await handleError(bot, interaction, error, 'reactionRolePanelEdit');
  }
}
