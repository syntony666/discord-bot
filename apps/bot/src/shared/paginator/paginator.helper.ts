import { PaginatorFactory } from './paginator.factory';
import { PaginatorType } from './paginator.types';
import type { PaginatorOptions, PageRenderer } from './paginator.types';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

export { PaginatorType } from './paginator.types';

export async function replyPaginated<T>(options: PaginatorOptions<T>): Promise<string> {
  const strategy = PaginatorFactory.createStrategy(options);
  return strategy.execute();
}

// ==================== Convenience functions ====================

export async function replyTextList<T>(options: {
  bot: Bot;
  interaction: BotInteraction;
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

export async function replyImageList<T>(options: {
  bot: Bot;
  interaction: BotInteraction;
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

export async function replyCustomList<T>(options: {
  bot: Bot;
  interaction: BotInteraction;
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
