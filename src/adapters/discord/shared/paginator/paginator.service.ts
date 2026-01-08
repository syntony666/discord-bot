import { createLogger } from 'core/logger';
import type { PageRenderer, PageRenderResult, PaginatorSession } from './paginator.types';
import { PaginatorSessionRepository } from './paginator.repository';
import { reducePaginatorState, type PaginatorState, type PaginatorEvent } from './paginator.state';
import { parsePaginatorAction, type PaginatorAction } from './paginator.actions';
import { buildPaginatorResponse } from './paginator.ui';
import type { Bot } from '@discordeno/bot';

const log = createLogger('Paginator');

function generateSessionId(length = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toEvent(action: PaginatorAction): PaginatorEvent {
  if (action === 'prev') return { type: 'PREV' };
  if (action === 'next') return { type: 'NEXT' };
  return { type: 'PAGE_CLICK' };
}

export class PaginatorService {
  constructor(
    private readonly repo: PaginatorSessionRepository,
    private readonly ttlMs: number = 30000
  ) {}

  async createPaginator<T>(
    bot: Bot,
    interaction: any,
    items: T[],
    renderer: PageRenderer<T>,
    options?: { pageSize?: number; userId?: string }
  ): Promise<string> {
    const pageSize = options?.pageSize ?? 10;
    const pages = this.buildPages(items, renderer, pageSize);
    const totalPages = pages.length;
    const sessionId = generateSessionId(5);
    const now = Date.now();

    const baseSession: Omit<PaginatorSession<T>, 'userId'> = {
      id: sessionId,
      pages,
      currentPage: 0,
      totalPages,
      expiresAt: now + this.ttlMs,
      messageToken: String(interaction.token),
      interactionId: BigInt(interaction.id),
    };
    const session: PaginatorSession<T> =
      options?.userId !== undefined ? { ...baseSession, userId: options.userId } : baseSession;

    const firstPage = pages[0] ?? { content: 'No content.', embeds: [] };
    const data = buildPaginatorResponse({
      sessionId,
      page: firstPage,
      currentPage: 0,
      totalPages,
    });

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data,
    });

    this.repo.save(session);
    return sessionId;
  }

  private buildPages<T>(
    items: T[],
    renderer: PageRenderer<T>,
    pageSize: number
  ): PageRenderResult[] {
    const pages: PageRenderResult[] = [];
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    for (let i = 0; i < items.length; i += pageSize) {
      const slice = items.slice(i, i + pageSize);
      const pageIndex = pages.length;
      pages.push(renderer.renderPage(slice, pageIndex, totalPages));
    }

    if (pages.length === 0) {
      pages.push(renderer.renderPage([], 0, 1));
    }

    return pages;
  }

  private async replyEphemeral(bot: Bot, interaction: any, content: string) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: { content, flags: 64 },
    });
  }

  private async replyReplace(bot: Bot, interaction: any, content: string) {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 7,
      data: { content, embeds: [], components: [] },
    });
  }

  async handleButton(bot: Bot, interaction: any): Promise<void> {
    const customId: string | undefined = interaction.data?.customId;
    if (!customId) return;

    const parsed = parsePaginatorAction(customId);
    if (!parsed) return;

    const { sessionId, action } = parsed;
    const session = this.repo.get(sessionId);
    if (!session) {
      await this.replyEphemeral(bot, interaction, 'This paginator has expired.');
      return;
    }

    const now = Date.now();
    if (session.expiresAt <= now) {
      this.repo.delete(sessionId);
      await this.replyReplace(bot, interaction, 'This paginator has expired.');
      return;
    }

    if (session.userId && interaction.user?.id?.toString() !== session.userId) {
      await this.replyEphemeral(bot, interaction, 'You cannot control this paginator.');
      return;
    }

    const event = toEvent(action);

    const prevState: PaginatorState = {
      currentPage: session.currentPage,
      totalPages: session.totalPages,
      expiresAt: session.expiresAt,
    };
    const newState = reducePaginatorState(prevState, event, now, this.ttlMs);

    const updated: PaginatorSession = {
      ...session,
      currentPage: newState.currentPage,
      expiresAt: newState.expiresAt,
    };
    this.repo.save(updated);

    const page = updated.pages[updated.currentPage];
    if (!page) {
      log.error({ sessionId, currentPage: updated.currentPage }, 'Paginator page not found');
      return;
    }

    const data = buildPaginatorResponse({
      sessionId,
      page,
      currentPage: updated.currentPage,
      totalPages: updated.totalPages,
    });

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 7,
      data,
    });
  }
}
