import { Bot, InteractionDataOption } from '@discordeno/bot';
import { KeywordModule } from '@features/keyword/keyword.module';
import { KeywordMatchType, KeywordRule } from '@prisma-client/client';
import { lastValueFrom } from 'rxjs';
import { replyTextList } from '@adapters/discord/shared/paginator/paginator.helper';
import {
  replySuccess,
  replyError,
  replyAutoError,
  replyWarning,
} from '@adapters/discord/shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';
import { BaseColors } from '@core/config/colors.config';

const log = createLogger('KeywordCommand');

/**
 * Temporary storage for pending overwrite confirmations
 */
const pendingOverwrites = new Map<
  string,
  {
    guildId: string;
    pattern: string;
    matchType: KeywordMatchType;
    response: string;
    editorId: string;
    existingRule: KeywordRule;
    expiresAt: number;
  }
>();

/**
 * Temporary storage for pending delete confirmations
 */
const pendingDeletes = new Map<
  string,
  {
    guildId: string;
    pattern: string;
    editorId: string;
    ruleToDelete: KeywordRule;
    expiresAt: number;
  }
>();

/**
 * Slash command handler for /keyword.
 * Supports subcommands: add, list, edit, delete.
 */
export function createKeywordCommandHandler(bot: Bot, module: KeywordModule) {
  const handler = async (interaction: BotInteraction) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;

    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await replyError(bot, interaction, {
        description: '此指令只能在伺服器中使用。',
      });
      return;
    }

    if (subName === 'add') {
      await handleAddKeyword(bot, interaction, module, guildId, sub);
    } else if (subName === 'list') {
      await handleListKeywords(bot, interaction, module, guildId);
    } else if (subName === 'edit') {
      await handleEditKeyword(bot, interaction, module, guildId, sub);
    } else if (subName === 'delete') {
      await handleDeleteKeyword(bot, interaction, module, guildId, sub);
    }
  };

  commandRegistry.registerCommand('keyword', handler);

  // Register button handlers
  commandRegistry.registerCustomIdHandler('kw:overwrite:', async (interaction, bot) => {
    await handleOverwriteButton(bot, interaction, module);
  });

  commandRegistry.registerCustomIdHandler('kw:delete:', async (interaction, bot) => {
    await handleDeleteButton(bot, interaction, module);
  });

  return handler;
}

async function handleAddKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const matchTypeStr = sub.options?.find((o: any) => o.name === 'match_type')?.value as string;
  const response = sub.options?.find((o: any) => o.name === 'response')?.value as string;

  const matchType =
    matchTypeStr === 'CONTAINS' ? KeywordMatchType.CONTAINS : KeywordMatchType.EXACT;

  const editorId = interaction.user?.id?.toString() || '';

  try {
    await lastValueFrom(
      module.createRule$({
        guildId,
        pattern,
        matchType,
        response,
        editorId,
      })
    );

    await replySuccess(bot, interaction, {
      title: '關鍵字已新增',
      description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
    });
  } catch (error: any) {
    // Check if it's a duplicate error
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      log.info({ pattern, guildId }, 'Duplicate keyword detected, offering overwrite option');

      try {
        // Fetch existing rule
        const existingRule = await lastValueFrom(module.getRuleByPattern$(guildId, pattern));

        if (!existingRule) {
          await replyError(bot, interaction, {
            description: `關鍵字 \`${pattern}\` 已存在，但無法取得詳細資訊。`,
          });
          return;
        }

        // Generate unique confirmation ID
        const confirmationId = `${guildId}:${pattern}:${Date.now()}`;
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

        // Store pending overwrite
        pendingOverwrites.set(confirmationId, {
          guildId,
          pattern,
          matchType,
          response,
          editorId,
          existingRule,
          expiresAt,
        });

        // Clean up expired confirmations
        cleanupExpiredConfirmations();

        // Send confirmation message with buttons
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            embeds: [
              {
                color: BaseColors.ORANGE,
                title: '關鍵字已存在',
                description: `關鍵字 \`${pattern}\` 已經存在，是否要覆蓋更新？`,
                fields: [
                  {
                    name: '目前設定',
                    value: `\`${existingRule.matchType}\` <@${existingRule.editorId}>\n**${existingRule.pattern}** ⭢ ${existingRule.response}`,
                    inline: false,
                  },
                  {
                    name: '新的設定',
                    value: `\`${matchType}\` <@${editorId}>\n**${pattern}** ⭢ ${response}`,
                    inline: false,
                  },
                ],
                footer: {
                  text: '此確認訊息將在 2 分鐘後失效',
                },
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3, // Green
                    label: '覆蓋更新',
                    customId: `kw:overwrite:${confirmationId}:confirm`,
                  },
                  {
                    type: 2,
                    style: 4, // Red
                    label: '取消',
                    customId: `kw:overwrite:${confirmationId}:cancel`,
                  },
                ],
              },
            ],
          },
        });
      } catch (fetchError) {
        log.error({ error: fetchError, pattern }, 'Failed to fetch existing rule');
        await replyAutoError(bot, interaction, error, {
          duplicate: `關鍵字 \`${pattern}\` 已經存在，請使用 \`/keyword edit\` 指令更新或先刪除原有規則。`,
          generic: '新增關鍵字規則時發生錯誤，請稍後再試。',
        });
      }
    } else {
      log.error({ error, pattern }, 'Failed to add keyword');

      await replyAutoError(bot, interaction, error, {
        generic: '新增關鍵字規則時發生錯誤，請稍後再試。',
      });
    }
  }
}

async function handleOverwriteButton(bot: Bot, interaction: BotInteraction, module: KeywordModule) {
  const customId = interaction.data?.customId || '';

  // Match pattern: kw:overwrite:{anything}:(confirm|cancel)
  const match = customId.match(/^kw:overwrite:(.+):(confirm|cancel)$/);

  if (!match) {
    await replyError(bot, interaction, {
      description: '無效的按鈕操作。',
    });
    return;
  }

  const confirmationId = match[1] as string;
  const action = match[2];

  const pending = pendingOverwrites.get(confirmationId);

  if (!pending) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '確認已過期',
            description: '此確認請求已過期或已被處理，請重新執行指令。',
          },
        ],
        components: [],
        flags: 64,
      },
    });
    return;
  }

  // Check if expired
  if (Date.now() > pending.expiresAt) {
    pendingOverwrites.delete(confirmationId);
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '確認已過期',
            description: '此確認請求已超過 2 分鐘，請重新執行指令。',
          },
        ],
        components: [],
        flags: 64,
      },
    });
    return;
  }

  // Check if the user is the same as the one who initiated
  const currentUserId = interaction.user?.id?.toString() || '';
  if (currentUserId !== pending.editorId) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '權限不足',
            description: '只有發起此操作的用戶可以確認或取消。',
          },
        ],
        flags: 64,
      },
    });
    return;
  }

  if (action === 'cancel') {
    pendingOverwrites.delete(confirmationId);

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 7, // Update message
      data: {
        embeds: [
          {
            color: BaseColors.GRAY,
            title: '已取消',
            description: `已取消覆蓋關鍵字 \`${pending.pattern}\`。`,
          },
        ],
        components: [],
      },
    });
    return;
  }

  if (action === 'confirm') {
    try {
      await lastValueFrom(
        module.updateRule$({
          guildId: pending.guildId,
          pattern: pending.pattern,
          response: pending.response,
          matchType: pending.matchType,
          editorId: pending.editorId,
        })
      );

      pendingOverwrites.delete(confirmationId);

      // Update the ephemeral message
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7, // Update message
        data: {
          embeds: [
            {
              color: BaseColors.GREEN,
              title: '關鍵字已更新',
              description: `<@${pending.editorId}> 已覆蓋更新關鍵字 \`${pending.pattern}\``,
              fields: [
                {
                  name: '新設定',
                  value: `\`${pending.matchType}\` **${pending.pattern}** ⭢ ${pending.response}`,
                  inline: false,
                },
              ],
            },
          ],
          components: [],
        },
      });

      log.info({ pattern: pending.pattern, guildId: pending.guildId }, 'Keyword overwritten');
    } catch (error) {
      log.error({ error, pattern: pending.pattern }, 'Failed to overwrite keyword');

      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7, // Update message
        data: {
          embeds: [
            {
              color: BaseColors.RED,
              title: '更新失敗',
              description: '更新關鍵字時發生錯誤，請稍後再試。',
            },
          ],
          components: [],
        },
      });
    }
  }
}

async function handleDeleteButton(bot: Bot, interaction: BotInteraction, module: KeywordModule) {
  const customId = interaction.data?.customId || '';

  // Match pattern: kw:delete:{anything}:(confirm|cancel)
  const match = customId.match(/^kw:delete:(.+):(confirm|cancel)$/);

  if (!match) {
    await replyError(bot, interaction, {
      description: '無效的按鈕操作。',
    });
    return;
  }

  const confirmationId = match[1] as string;
  const action = match[2];

  const pending = pendingDeletes.get(confirmationId);

  if (!pending) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '確認已過期',
            description: '此確認請求已過期或已被處理，請重新執行指令。',
          },
        ],
        components: [],
        flags: 64,
      },
    });
    return;
  }

  // Check if expired
  if (Date.now() > pending.expiresAt) {
    pendingDeletes.delete(confirmationId);
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '確認已過期',
            description: '此確認請求已超過 2 分鐘，請重新執行指令。',
          },
        ],
        components: [],
        flags: 64,
      },
    });
    return;
  }

  // Check if the user is the same as the one who initiated
  const currentUserId = interaction.user?.id?.toString() || '';
  if (currentUserId !== pending.editorId) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '權限不足',
            description: '只有發起此操作的用戶可以確認或取消。',
          },
        ],
        flags: 64,
      },
    });
    return;
  }

  if (action === 'cancel') {
    pendingDeletes.delete(confirmationId);

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 7, // Update message
      data: {
        embeds: [
          {
            color: BaseColors.GRAY,
            title: '已取消',
            description: `已取消刪除關鍵字 \`${pending.pattern}\`。`,
          },
        ],
        components: [],
      },
    });
    return;
  }

  if (action === 'confirm') {
    try {
      await lastValueFrom(module.deleteRule$(pending.guildId, pending.pattern));

      pendingDeletes.delete(confirmationId);

      // Update the ephemeral message
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7, // Update message
        data: {
          embeds: [
            {
              color: BaseColors.GRAY,
              title: '關鍵字已刪除',
              description: `<@${pending.editorId}> 已刪除關鍵字 \`${pending.pattern}\``,
              fields: [
                {
                  name: '已刪除的設定',
                  value: `\`${pending.ruleToDelete.matchType}\` **${pending.ruleToDelete.pattern}** ⭢ ${pending.ruleToDelete.response}`,
                  inline: false,
                },
              ],
            },
          ],
          components: [],
        },
      });

      log.info({ pattern: pending.pattern, guildId: pending.guildId }, 'Keyword deleted');
    } catch (error: any) {
      log.error({ error, pattern: pending.pattern }, 'Failed to delete keyword');

      // Check if rule no longer exists
      if (error?.code === 'P2025' || error?.message?.includes('Record to delete does not exist')) {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 7, // Update message
          data: {
            embeds: [
              {
                color: BaseColors.RED,
                title: '刪除失敗',
                description: `關鍵字 \`${pending.pattern}\` 已不存在，可能已被其他人刪除。`,
              },
            ],
            components: [],
          },
        });
      } else {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 7, // Update message
          data: {
            embeds: [
              {
                color: BaseColors.RED,
                title: '刪除失敗',
                description: '刪除關鍵字時發生錯誤，請稍後再試。',
              },
            ],
            components: [],
          },
        });
      }
    }
  }
}

function cleanupExpiredConfirmations() {
  const now = Date.now();

  // Clean up overwrite confirmations
  for (const [id, pending] of pendingOverwrites.entries()) {
    if (now > pending.expiresAt) {
      pendingOverwrites.delete(id);
      log.debug({ confirmationId: id, type: 'overwrite' }, 'Cleaned up expired confirmation');
    }
  }

  // Clean up delete confirmations
  for (const [id, pending] of pendingDeletes.entries()) {
    if (now > pending.expiresAt) {
      pendingDeletes.delete(id);
      log.debug({ confirmationId: id, type: 'delete' }, 'Cleaned up expired confirmation');
    }
  }
}

async function handleListKeywords(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string
) {
  try {
    const rules = await lastValueFrom(module.getRulesByGuild$(guildId));

    await replyTextList({
      bot,
      interaction,
      items: rules,
      title: () => `關鍵字規則列表`,
      mapItem: (r) => `\`${r.matchType}\` <@${r.editorId}>\n**${r.pattern}** ⭢ ${r.response}\n`,
      emptyText: '目前沒有任何關鍵字規則。',
      pageSize: 10,
      userId: interaction.user?.id?.toString(),
    });
  } catch (error) {
    log.error({ error }, 'Failed to list keywords');

    await replyError(bot, interaction, {
      description: '取得關鍵字規則時發生錯誤，請稍後再試。',
    });
  }
}

async function handleEditKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const response = sub.options?.find((o: any) => o.name === 'response')?.value as string;
  const matchType =
    sub.options?.find((o: any) => o.name === 'match_type')?.value === 'CONTAINS'
      ? KeywordMatchType.CONTAINS
      : KeywordMatchType.EXACT;

  const editorId = interaction.user?.id?.toString() || '';

  try {
    await lastValueFrom(
      module.updateRule$({
        guildId,
        pattern,
        response,
        matchType,
        editorId,
      })
    );

    await replySuccess(bot, interaction, {
      title: '關鍵字已更新',
      description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
    });
  } catch (error) {
    log.error({ error, pattern }, 'Failed to edit keyword');

    await replyAutoError(bot, interaction, error, {
      notFound: `關鍵字 \`${pattern}\` 不存在。`,
      generic: '更新關鍵字規則時發生錯誤，請稍後再試。',
    });
  }
}

async function handleDeleteKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  guildId: string,
  sub: InteractionDataOption
) {
  const pattern = sub.options?.find((o: any) => o.name === 'pattern')?.value as string;
  const editorId = interaction.user?.id?.toString() || '';

  try {
    // Fetch the rule to delete
    const ruleToDelete = await lastValueFrom(module.getRuleByPattern$(guildId, pattern));

    if (!ruleToDelete) {
      await replyAutoError(
        bot,
        interaction,
        { code: 'P2025' },
        {
          notFound: `關鍵字 \`${pattern}\` 不存在。`,
        }
      );
      return;
    }

    // Generate unique confirmation ID
    const confirmationId = `${guildId}:${pattern}:${Date.now()}`;
    const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

    // Store pending delete
    pendingDeletes.set(confirmationId, {
      guildId,
      pattern,
      editorId,
      ruleToDelete,
      expiresAt,
    });

    // Clean up expired confirmations
    cleanupExpiredConfirmations();

    // Send confirmation message with buttons
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.ORANGE,
            title: '確認刪除關鍵字',
            description: `即將刪除關鍵字 \`${pattern}\`，此操作無法復原。`,
            fields: [
              {
                name: '關鍵字設定',
                value: `\`${ruleToDelete.matchType}\` <@${ruleToDelete.editorId}>\n**${ruleToDelete.pattern}** ⭢ ${ruleToDelete.response}`,
                inline: false,
              },
            ],
            footer: {
              text: '此確認訊息將在 2 分鐘後失效',
            },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4, // Red
                label: '確認刪除',
                customId: `kw:delete:${confirmationId}:confirm`,
              },
              {
                type: 2,
                style: 2, // Gray
                label: '取消',
                customId: `kw:delete:${confirmationId}:cancel`,
              },
            ],
          },
        ],
      },
    });

    log.info({ pattern, guildId }, 'Delete confirmation requested');
  } catch (error) {
    log.error({ error, pattern }, 'Failed to prepare delete confirmation');

    await replyError(bot, interaction, {
      description: '準備刪除確認時發生錯誤，請稍後再試。',
    });
  }
}
