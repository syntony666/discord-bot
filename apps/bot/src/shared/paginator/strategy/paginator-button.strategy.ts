import { createLogger } from '@core/logger';
import type { DiscordActions } from '@core/discord/discord-actions';
import { interactionComponents, interactionCustomId } from '@core/discord/interaction.helpers';
import { ComponentType, InteractionResponseType, TextInputStyle } from 'discord-api-types/v10';
import { PaginatorSessionRepository } from '../core/paginator.repository';
import {
  reducePaginatorState,
  type PaginatorState,
  type PaginatorEvent,
} from '../core/paginator.state';
import { parsePaginatorAction } from '../core/paginator.actions';
import { buildPaginatorResponse } from '../ui/paginator.ui';
import { replyError } from '../../message/message.helper';
import { Timeouts } from '@core/config/constants';
import type { BotInteraction } from '@core/rx/bus';
import { PageRenderResult } from '../paginator.types';

const log = createLogger('PaginatorButtonStrategy');

function toEvent(action: 'prev' | 'page' | 'next'): PaginatorEvent {
  if (action === 'prev') return { type: 'PREV' };
  if (action === 'next') return { type: 'NEXT' };
  return { type: 'PAGE_CLICK' };
}

export class PaginatorButtonStrategy {
  private readonly repo = new PaginatorSessionRepository();
  private readonly ttlMs: number;

  constructor(ttlMs: number = Timeouts.PAGINATOR_MS) {
    this.ttlMs = ttlMs;
  }

  async handle(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    const customId = interactionCustomId(interaction);
    if (!customId) {
      log.warn('Button interaction without customId');
      return;
    }

    const parsed = parsePaginatorAction(customId);
    if (!parsed) {
      log.warn({ customId }, 'Invalid paginator customId format');
      return;
    }

    const { sessionId, action } = parsed;
    const session = this.repo.get(sessionId);

    // Session missing → ephemeral error
    if (!session) {
      await replyError(actions, interaction, {
        description: '此分頁已過期，請重新執行指令。',
        ephemeral: true,
      });
      return;
    }

    const now = Date.now();

    // Session expired → update original message and remove buttons
    if (session.expiresAt <= now) {
      this.repo.delete(sessionId);
      await this.updateMessageAsExpired(actions, interaction);
      return;
    }

    // Permission check → only creator can control (when userId is set)
    if (session.userId && interaction.user?.id !== session.userId) {
      await replyError(actions, interaction, {
        description: '只有建立此分頁的使用者可以操作按鈕。',
        ephemeral: true,
      });
      return;
    }

    // Handle page jump button
    if (action === 'page') {
      await this.handlePageJump(actions, interaction, session, sessionId);
      return;
    }

    const event = toEvent(action);

    const prevState: PaginatorState = {
      currentPage: session.currentPage,
      totalPages: session.totalPages,
      expiresAt: session.expiresAt,
    };
    const newState = reducePaginatorState(prevState, event, now, this.ttlMs);

    const updatedSession = {
      ...session,
      currentPage: newState.currentPage,
      expiresAt: newState.expiresAt,
    };
    this.repo.save(updatedSession);

    const page = updatedSession.pages[updatedSession.currentPage];

    if (!page) {
      log.error({ sessionId, currentPage: updatedSession.currentPage }, 'Paginator page not found');
      await replyError(actions, interaction, {
        description: '分頁發生錯誤，請重新執行指令。',
        ephemeral: true,
      });
      return;
    }

    const data = buildPaginatorResponse({
      sessionId,
      page,
      currentPage: updatedSession.currentPage,
      totalPages: updatedSession.totalPages,
    });

    try {
      await actions.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseType.UpdateMessage,
        data,
      });
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to update paginator');
    }
  }

  private async handlePageJump(
    actions: DiscordActions,
    interaction: BotInteraction,
    session: any,
    sessionId: string
  ): Promise<void> {
    try {
      await actions.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseType.Modal,
        data: {
          custom_id: `pg:${sessionId}:jump`,
          title: '跳轉至指定頁面',
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.TextInput,
                  custom_id: 'page_number',
                  label: '頁碼',
                  style: TextInputStyle.Short,
                  placeholder: `請輸入 1-${session.totalPages} 之間的數字`,
                  required: true,
                  min_length: 1,
                  max_length: String(session.totalPages).length,
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to show page jump modal');
    }
  }

  async handleModalSubmit(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    const customId = interactionCustomId(interaction);
    if (!customId || !customId.startsWith('pg:') || !customId.endsWith(':jump')) {
      return;
    }

    const sessionId = customId.split(':')[1] as string;
    const session = this.repo.get(sessionId);

    if (!session) {
      await replyError(actions, interaction, {
        description: '此分頁已過期，請重新執行指令。',
        ephemeral: true,
      });
      return;
    }

    const firstRow = interactionComponents(interaction)?.[0];
    const pageNumberInput =
      firstRow && 'components' in firstRow
        ? (firstRow.components[0] as { value?: string } | undefined)?.value
        : undefined;
    const pageNumber = parseInt(pageNumberInput || '1', 10);

    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > session.totalPages) {
      await replyError(actions, interaction, {
        description: `請輸入 1 到 ${session.totalPages} 之間的有效頁碼。`,
        ephemeral: true,
      });
      return;
    }

    const now = Date.now();
    const newPage = pageNumber - 1;

    const updatedSession = {
      ...session,
      currentPage: newPage,
      expiresAt: now + this.ttlMs,
    };
    this.repo.save(updatedSession);

    const page = updatedSession.pages[newPage] as PageRenderResult;

    const data = buildPaginatorResponse({
      sessionId,
      page,
      currentPage: newPage,
      totalPages: session.totalPages,
    });

    try {
      await actions.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseType.UpdateMessage,
        data,
      });
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to jump to page');
    }
  }

  private async updateMessageAsExpired(actions: DiscordActions, interaction: BotInteraction): Promise<void> {
    try {
      await actions.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseType.UpdateMessage,
        data: {
          embeds: [
            {
              description: '❌ 此分頁已過期，請重新執行指令取得最新內容。',
              color: 0xe6161a,
            },
          ],
          components: [],
        },
      });
    } catch (error) {
      log.error({ error }, 'Failed to update expired paginator');
    }
  }
}
