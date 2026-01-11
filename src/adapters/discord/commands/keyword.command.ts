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
import { createConfirmation } from '@adapters/discord/shared/confirmation/confirmation.helper';

const log = createLogger('KeywordCommand');

interface OverwriteData {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType;
  response: string;
  editorId: string;
  existingRule: KeywordRule;
}

interface DeleteData {
  guildId: string;
  pattern: string;
  editorId: string;
  ruleToDelete: KeywordRule;
}

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
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      await handleDuplicateKeyword(bot, interaction, module, {
        guildId,
        pattern,
        matchType,
        response,
        editorId,
      });
    } else {
      log.error({ error, pattern }, 'Failed to add keyword');
      await replyAutoError(bot, interaction, error, {
        generic: '新增關鍵字規則時發生錯誤,請稍後再試。',
      });
    }
  }
}

async function handleDuplicateKeyword(
  bot: Bot,
  interaction: BotInteraction,
  module: KeywordModule,
  input: {
    guildId: string;
    pattern: string;
    matchType: KeywordMatchType;
    response: string;
    editorId: string;
  }
) {
  try {
    const existingRule = await lastValueFrom(
      module.getRuleByPattern$(input.guildId, input.pattern)
    );

    if (!existingRule) {
      await replyError(bot, interaction, {
        description: `關鍵字 \`${input.pattern}\` 已存在,但無法取得詳細資訊。`,
      });
      return;
    }

    await createConfirmation<OverwriteData>(
      bot,
      interaction,
      {
        confirmationType: 'kw_overwrite',
        userId: input.editorId,
        guildId: input.guildId,
        data: { ...input, existingRule },
        embed: {
          title: '關鍵字已存在',
          description: `關鍵字 \`${input.pattern}\` 已經存在,是否要覆蓋更新?`,
          fields: [
            {
              name: '目前設定',
              value: `\`${existingRule.matchType}\` <@${existingRule.editorId}>\n**${existingRule.pattern}** ⭢ ${existingRule.response}`,
            },
            {
              name: '新的設定',
              value: `\`${input.matchType}\` <@${input.editorId}>\n**${input.pattern}** ⭢ ${input.response}`,
            },
          ],
        },
        buttons: {
          confirmLabel: '覆蓋更新',
          confirmStyle: 3,
          cancelLabel: '取消',
          cancelStyle: 4,
        },
      },
      {
        onConfirm: async (bot, interaction, data) => {
          try {
            await lastValueFrom(
              module.updateRule$({
                guildId: data.guildId,
                pattern: data.pattern,
                response: data.response,
                matchType: data.matchType,
                editorId: data.editorId,
              })
            );

            await replySuccess(bot, interaction, {
              title: '關鍵字已更新',
              description: `<@${data.editorId}> 已覆蓋更新關鍵字 \`${data.pattern}\``,
              fields: [
                {
                  name: '新設定',
                  value: `\`${data.matchType}\` **${data.pattern}** ⭢ ${data.response}`,
                },
              ],
              isEdit: true,
            });

            log.info({ pattern: data.pattern, guildId: data.guildId }, 'Keyword overwritten');
          } catch (error) {
            log.error({ error, pattern: data.pattern }, 'Failed to overwrite keyword');

            await replyError(bot, interaction, {
              title: '更新失敗',
              description: '更新關鍵字時發生錯誤,請稍後再試。',
              isEdit: true,
            });
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyWarning(bot, interaction, {
            title: '已取消',
            description: `已取消覆蓋關鍵字 \`${data.pattern}\`。`,
            isEdit: true,
          });
        },
      }
    );
  } catch (fetchError) {
    log.error({ error: fetchError, pattern: input.pattern }, 'Failed to fetch existing rule');
    await replyAutoError(bot, interaction, fetchError, {
      duplicate: `關鍵字 \`${input.pattern}\` 已經存在,請使用 \`/keyword edit\` 指令更新或先刪除原有規則。`,
      generic: '新增關鍵字規則時發生錯誤,請稍後再試。',
    });
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
      description: '取得關鍵字規則時發生錯誤,請稍後再試。',
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
      generic: '更新關鍵字規則時發生錯誤,請稍後再試。',
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
    const ruleToDelete = await lastValueFrom(module.getRuleByPattern$(guildId, pattern));

    if (!ruleToDelete) {
      await replyAutoError(
        bot,
        interaction,
        { code: 'P2025' },
        { notFound: `關鍵字 \`${pattern}\` 不存在。` }
      );
      return;
    }

    await createConfirmation<DeleteData>(
      bot,
      interaction,
      {
        confirmationType: 'kw_delete',
        userId: editorId,
        guildId,
        data: { guildId, pattern, editorId, ruleToDelete },
        embed: {
          title: '確認刪除關鍵字',
          description: `即將刪除關鍵字 \`${pattern}\`,此操作無法復原。`,
          fields: [
            {
              name: '關鍵字設定',
              value: `\`${ruleToDelete.matchType}\` <@${ruleToDelete.editorId}>\n**${ruleToDelete.pattern}** ⭢ ${ruleToDelete.response}`,
            },
          ],
        },
        buttons: {
          confirmLabel: '確認刪除',
          confirmStyle: 4,
          cancelLabel: '取消',
          cancelStyle: 2,
        },
      },
      {
        onConfirm: async (bot, interaction, data) => {
          try {
            await lastValueFrom(module.deleteRule$(data.guildId, data.pattern));

            await replyWarning(bot, interaction, {
              title: '關鍵字已刪除',
              description: `<@${data.editorId}> 已刪除關鍵字 \`${data.pattern}\``,
              fields: [
                {
                  name: '已刪除的設定',
                  value: `\`${data.ruleToDelete.matchType}\` **${data.ruleToDelete.pattern}** ⭢ ${data.ruleToDelete.response}`,
                },
              ],
              isEdit: true,
            });

            log.info({ pattern: data.pattern, guildId: data.guildId }, 'Keyword deleted');
          } catch (error: any) {
            log.error({ error, pattern: data.pattern }, 'Failed to delete keyword');

            if (
              error?.code === 'P2025' ||
              error?.message?.includes('Record to delete does not exist')
            ) {
              await replyError(bot, interaction, {
                title: '刪除失敗',
                description: `關鍵字 \`${data.pattern}\` 已不存在,可能已被其他人刪除。`,
                isEdit: true,
              });
            } else {
              await replyError(bot, interaction, {
                title: '刪除失敗',
                description: '刪除關鍵字時發生錯誤,請稍後再試。',
                isEdit: true,
              });
            }
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyWarning(bot, interaction, {
            title: '已取消',
            description: `已取消刪除關鍵字 \`${data.pattern}\`。`,
            isEdit: true,
          });
        },
      }
    );

    log.info({ pattern, guildId }, 'Delete confirmation requested');
  } catch (error) {
    log.error({ error, pattern }, 'Failed to prepare delete confirmation');
    await replyError(bot, interaction, {
      description: '準備刪除確認時發生錯誤,請稍後再試。',
    });
  }
}
