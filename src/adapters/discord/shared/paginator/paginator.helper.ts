import { PaginatorFactory } from './paginator.factory';
import { PaginatorType } from './paginator.types';
import type { PaginatorOptions, PageRenderer } from './paginator.types';
import type { Bot } from '@discordeno/bot';

export { PaginatorType } from './paginator.types';

/**
 * Low-level entry point for all paginated replies.
 */
export async function replyPaginated<T>(options: PaginatorOptions<T>): Promise<string> {
  const strategy = PaginatorFactory.createStrategy(options);
  return strategy.execute();
}

// ==================== Convenience functions ====================

/**
 * Reply with a paginated text list.
 */
export async function replyTextList<T>(options: {
  bot: Bot;
  interaction: any;
  items: T[];
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => string;
  emptyText?: string;
  pageSize?: number;
  userId?: string;
}): Promise<string> {
  return replyPaginated({
    type: PaginatorType.TEXT_LIST,
    ...options,
  });
}

/**
 * Reply with a paginated image list.
 */
export async function replyImageList<T>(options: {
  bot: Bot;
  interaction: any;
  items: T[];
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => { url: string; description?: string };
  emptyText?: string;
  pageSize?: number;
  userId?: string;
}): Promise<string> {
  return replyPaginated({
    type: PaginatorType.IMAGE_LIST,
    ...options,
  });
}

/**
 * Reply with a custom paginated renderer.
 */
export async function replyCustomList<T>(options: {
  bot: Bot;
  interaction: any;
  items: T[];
  renderer: PageRenderer<T>;
  pageSize?: number;
  userId?: string;
}): Promise<string> {
  return replyPaginated({
    type: PaginatorType.CUSTOM,
    ...options,
  });
}
