import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { ReactionRoleService } from '@features/reaction-role/reaction-role.service';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyError,
  replyAutoError,
  replyInfo,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction, BotMessage } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';
import { Colors } from '@core/config/colors.config';
import {
  formatEmojiForDisplay,
  formatEmojiForReaction,
  normalizeEmojiForStorage,
} from '@features/reaction-role/emoji.helper';

const log = createLogger('ReactionRoleCommand');

export function createReactionRoleCommandHandler(
  bot: Bot,
  module: ReactionRoleModule,
  service: ReactionRoleService
) {
  const handler = async (interaction: BotInteraction) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await replyError(bot, interaction, {
        description: '此指令只能在伺服器中使用。',
      });
      return;
    }

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    if (subGroupName === 'panel') {
      await handlePanelCommands(bot, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'add') {
      await handleAdd(bot, interaction, module, service, guildId, subGroup);
    } else if (subGroupName === 'remove') {
      await handleRemove(bot, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'list') {
      await handleList(bot, interaction, module, guildId, subGroup);
    }
  };

  commandRegistry.registerCommand('reaction-role', handler);
  return handler;
}

// ==================== Panel Commands ====================

async function handlePanelCommands(
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
  const mode =
    (subCommand.options?.find((o) => o.name === 'mode')?.value as 'NORMAL' | 'UNIQUE' | 'VERIFY') ||
    'NORMAL';

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
      description: `Reaction Role Panel 已在 <#${channelId}> 建立。\n\n**Panel ID**: \`${message.id}\`\n\n使用 \`/reaction-role add\` 來添加身分組。`,
    });

    log.info({ guildId, channelId, messageId: message.id.toString() }, 'Panel created');
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to create panel');
    await replyAutoError(bot, interaction, error, {
      generic: '建立 Panel 時發生錯誤。請確認 Bot 有在該頻道發送訊息的權限。',
    });
  }
}

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
        const modeText = getModeText(panel.mode);

        return [
          `**${panel.title}**`,
          `ID: \`${panel.messageId}\``,
          `頻道: <#${panel.channelId}>`,
          `模式: ${modeText}`,
          `身分組數量: ${roles.length} 個`,
          `[跳轉至訊息](https://discord.com/channels/${guildId}/${panel.channelId}/${panel.messageId})`,
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
    await replyError(bot, interaction, {
      description: '查詢 Panel 列表時發生錯誤。',
    });
  }
}

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
    await replyAutoError(bot, interaction, error, {
      generic: '刪除 Panel 時發生錯誤。',
    });
  }
}

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
    (subCommand.options?.find((o) => o.name === 'mode')?.value as 'NORMAL' | 'UNIQUE' | 'VERIFY') ||
    undefined;

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
        mode: updatedPanel.mode,
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
    await replyAutoError(bot, interaction, error, {
      generic: '更新 Panel 時發生錯誤。',
    });
  }
}

// ==================== Reaction Role Commands ====================

async function handleAdd(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  service: ReactionRoleService,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;
  const emojiInput = subGroup.options?.find((o) => o.name === 'emoji')?.value as string;
  const roleId = subGroup.options?.find((o) => o.name === 'role')?.value as string;
  const description =
    (subGroup.options?.find((o) => o.name === 'description')?.value as string) || undefined;

  const emoji = normalizeEmojiForStorage(emojiInput);

  try {
    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));
    if (!panel) {
      await replyError(bot, interaction, {
        title: 'Panel 不存在',
        description: `找不到 ID 為 \`${panelId}\` 的 Panel。\n請先使用 \`/reaction-role panel create\` 建立 Panel。`,
      });
      return;
    }

    await lastValueFrom(
      module.createReactionRole$({
        guildId,
        messageId: panelId,
        emoji,
        roleId,
        description,
      })
    );

    const reactionEmoji = formatEmojiForReaction(emoji);
    await bot.helpers.addReaction(BigInt(panel.channelId), BigInt(panelId), reactionEmoji);

    const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

    await bot.helpers.editMessage(
      BigInt(panel.channelId),
      BigInt(panelId),
      buildPanelEmbed({
        title: panel.title,
        description: panel.description || undefined,
        mode: panel.mode,
        roles,
        messageId: panelId,
      })
    );

    const displayEmoji = formatEmojiForDisplay(emoji);
    await replySuccess(bot, interaction, {
      title: 'Reaction Role 已添加',
      description: `${displayEmoji} → <@&${roleId}> 已添加到 Panel。`,
    });

    log.info({ guildId, messageId: panelId, emoji, roleId }, 'Reaction role added');
  } catch (error) {
    log.error({ error, guildId, messageId: panelId, emoji }, 'Failed to add reaction role');
    await replyAutoError(bot, interaction, error, {
      duplicate: `這個 emoji 已經綁定了身分組。`,
      generic: '添加 Reaction Role 時發生錯誤。',
    });
  }
}

async function handleRemove(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;
  const emojiInput = subGroup.options?.find((o) => o.name === 'emoji')?.value as string;

  const emoji = normalizeEmojiForStorage(emojiInput);

  try {
    const reactionRole = await lastValueFrom(module.getReactionRole$(guildId, panelId, emoji));
    if (!reactionRole) {
      await replyError(bot, interaction, {
        title: 'Reaction Role 不存在',
        description: `在 Panel \`${panelId}\` 中找不到 ${emojiInput} 的綁定。\n\n**提示**: 請使用 \`/reaction-role list\` 查看正確的 emoji 格式。`,
      });
      return;
    }

    const panel = await lastValueFrom(module.getPanel$(guildId, panelId));

    await lastValueFrom(module.deleteReactionRole$(guildId, panelId, emoji));

    if (panel) {
      try {
        const reactionEmoji = formatEmojiForReaction(emoji);
        await bot.helpers.deleteOwnReaction(
          BigInt(panel.channelId),
          BigInt(panelId),
          reactionEmoji
        );
      } catch {}

      const roles = await lastValueFrom(module.getReactionRolesByMessage$(guildId, panelId));

      await bot.helpers.editMessage(
        BigInt(panel.channelId),
        BigInt(panelId),
        buildPanelEmbed({
          title: panel.title,
          description: panel.description || undefined,
          mode: panel.mode,
          roles,
          messageId: panelId,
        })
      );
    }

    const displayEmoji = formatEmojiForDisplay(emoji);
    await replySuccess(bot, interaction, {
      title: 'Reaction Role 已移除',
      description: `${displayEmoji} 的綁定已從 Panel 中移除。`,
    });

    log.info({ guildId, messageId: panelId, emoji }, 'Reaction role removed');
  } catch (error) {
    log.error(
      { error, guildId, messageId: panelId, emoji: emojiInput },
      'Failed to remove reaction role'
    );
    await replyAutoError(bot, interaction, error, {
      generic: '移除 Reaction Role 時發生錯誤。',
    });
  }
}

async function handleList(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const panelId = subGroup.options?.find((o) => o.name === 'panel_id')?.value as string;

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

    if (roles.length === 0) {
      await replyInfo(bot, interaction, {
        title: `${panel.title} - Reaction Roles`,
        description: '此 Panel 尚未添加任何 Reaction Role。\n使用 `/reaction-role add` 來添加。',
      });
      return;
    }

    const description = roles
      .map((role, index) => {
        const displayEmoji = formatEmojiForDisplay(role.emoji);
        return [
          `**${index + 1}.** ${displayEmoji} → <@&${role.roleId}>`,
          role.description ? `   └ ${role.description}` : '',
          `   \`emoji: ${role.emoji}\``,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    await replyInfo(bot, interaction, {
      title: `${panel.title} - Reaction Roles (${roles.length} 個)`,
      description: description + '\n\n**提示**: 移除時請複製上方的 `emoji:` 值使用。',
    });
  } catch (error) {
    log.error({ error, guildId, panelId }, 'Failed to list reaction roles');
    await replyError(bot, interaction, {
      description: '查詢 Reaction Roles 時發生錯誤。',
    });
  }
}

// ==================== Helper Functions ====================

function buildPanelEmbed(options: {
  title?: string;
  description?: string;
  mode: 'NORMAL' | 'UNIQUE' | 'VERIFY';
  roles: Array<{ emoji: string; roleId: string; description?: string | null }>;
  messageId?: string;
}) {
  const { title, description, mode, roles, messageId } = options;

  return {
    embeds: [
      {
        title: title || '選擇你的身分組',
        description: description || '點擊下方的反應來獲得對應的身分組。\n再次點擊可以移除身分組。',
        color: Colors.INFO,
        fields: [
          {
            name: '模式',
            value: getModeText(mode),
            inline: false,
          },
          {
            name: '身分組列表',
            value:
              roles.length > 0
                ? roles
                    .map((r) => {
                      const displayEmoji = formatEmojiForDisplay(r.emoji);
                      return `${displayEmoji} → <@&${r.roleId}>${r.description ? ` - ${r.description}` : ''}`;
                    })
                    .join('\n')
                : '⏳ 尚未添加任何身分組',
            inline: false,
          },
        ],
        footer: messageId
          ? {
              text: `Panel ID: ${messageId}`,
            }
          : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function getModeText(mode: string): string {
  switch (mode) {
    case 'NORMAL':
      return '📋 多選模式';
    case 'UNIQUE':
      return '⚠️ 單選模式';
    case 'VERIFY':
      return '✅ 驗證模式';
    default:
      return '📋 多選模式';
  }
}
