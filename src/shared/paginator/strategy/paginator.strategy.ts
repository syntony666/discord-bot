import { createLogger } from '@core/logger';
import { PaginatorSessionRepository } from '../core/paginator.repository';
import type { Renderer } from '../renderer/renderer.interface';
import type { PageRenderResult, PaginatorSession } from '../paginator.types';
import type { Bot } from '@discordeno/bot';
import { buildPaginatorResponse } from '../ui/paginator.ui';

const log = createLogger('PaginatorStrategy');

export interface PaginatorStrategyConfig<T> {
  bot: Bot;
  interaction: any;
  items: T[];
  renderer: Renderer<T>;
  pageSize: number;
  userId?: string;
  ttlMs?: number;
}

/**
 * Orchestrates pagination: builds pages, stores session state,
 * and sends the initial interaction response.
 */
export class PaginatorStrategy<T> {
  private readonly repository: PaginatorSessionRepository;
  private readonly ttlMs: number;

  constructor(private readonly config: PaginatorStrategyConfig<T>) {
    this.repository = new PaginatorSessionRepository();
    this.ttlMs = config.ttlMs ?? 30000;
  }

  async execute(): Promise<string> {
    const { bot, interaction, items, renderer, pageSize, userId } = this.config;

    const pages = this.buildPages(items, renderer, pageSize);
    const totalPages = pages.length;
    const sessionId = this.generateSessionId();
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
      userId !== undefined ? { ...baseSession, userId } : baseSession;

    const firstPage = pages[0] ?? { content: 'No content.', embeds: [] };
    const data = buildPaginatorResponse({
      sessionId,
      page: firstPage,
      currentPage: 0,
      totalPages,
    });

    try {
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 4,
        data,
      });

      this.repository.save(session);
      return sessionId;
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to create paginator');
      throw error;
    }
  }

  /**
   * Build all pages up front using the provided renderer.
   */
  private buildPages(items: T[], renderer: Renderer<T>, pageSize: number): PageRenderResult[] {
    const pages: PageRenderResult[] = [];
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    for (let i = 0; i < items.length; i += pageSize) {
      const slice = items.slice(i, i + pageSize);
      const pageIndex = pages.length;
      pages.push(renderer.render(slice, pageIndex, totalPages));
    }

    if (pages.length === 0) {
      pages.push(renderer.render([], 0, 1));
    }

    return pages;
  }

  /**
   * Generate a short, human-unfriendly session id for button customIds.
   */
  private generateSessionId(length = 5): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }
}
