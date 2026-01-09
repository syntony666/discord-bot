import { createLogger } from '@core/logger';
import { PaginatorSessionRepository } from '../core/paginator.repository';
import {
  reducePaginatorState,
  type PaginatorState,
  type PaginatorEvent,
} from '../core/paginator.state';
import { parsePaginatorAction } from '../core/paginator.actions';
import { buildPaginatorResponse } from '../ui/paginator.ui';
import { replyError } from '../../message/message.helper';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

const log = createLogger('PaginatorButtonStrategy');

function toEvent(action: 'prev' | 'page' | 'next'): PaginatorEvent {
  if (action === 'prev') return { type: 'PREV' };
  if (action === 'next') return { type: 'NEXT' };
  return { type: 'PAGE_CLICK' };
}

/**
 * Handle paginator button interactions (Prev / Next / Page label)
 */
export class PaginatorButtonStrategy {
  private readonly repo = new PaginatorSessionRepository();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 30000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Entry point for handling a paginator button interaction.
   */
  async handle(bot: Bot, interaction: BotInteraction): Promise<void> {
    const customId: string | undefined = interaction.data?.customId;
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
      await replyError(bot, interaction, {
        description: '此分頁已過期，請重新執行指令。',
        ephemeral: true,
      });
      return;
    }

    const now = Date.now();

    // Session expired → update original message and remove buttons
    if (session.expiresAt <= now) {
      this.repo.delete(sessionId);
      await this.updateMessageAsExpired(bot, interaction);
      return;
    }

    // Permission check → only creator can control (when userId is set)
    if (session.userId && interaction.user?.id?.toString() !== session.userId) {
      await replyError(bot, interaction, {
        description: '只有建立此分頁的使用者可以操作按鈕。',
        ephemeral: true,
      });
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
      await replyError(bot, interaction, {
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
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7, // UPDATE_MESSAGE
        data,
      });
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to update paginator');
    }
  }

  /**
   * Update the original message to indicate expiration and remove buttons.
   */
  private async updateMessageAsExpired(bot: Bot, interaction: BotInteraction): Promise<void> {
    try {
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7, // UPDATE_MESSAGE
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
