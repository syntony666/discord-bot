// paginator.list-helper.ts
import type { Bot } from '@discordeno/bot';
import { PaginatorSessionRepository } from './paginator.repository';
import { PaginatorService } from './paginator.service';
import type { PageRenderResult, PageRenderer } from './paginator.types';

function createTextListRenderer<T>(options: {
  title: (pageIndex: number, totalPages: number) => string;
  mapItem: (item: T) => string;
  emptyText?: string;
}): PageRenderer<T> {
  const { title, mapItem, emptyText = 'No items.' } = options;

  const renderer: PageRenderer<T> = {
    renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult {
      const description = items.length === 0 ? emptyText : items.map(mapItem).join('\n');

      return {
        embeds: [
          {
            title: title(pageIndex, totalPages),
            description,
          },
        ],
      };
    },
  };

  return renderer;
}

// 高階 helper：一行搞定 paginator list
export async function paginateTextList<T>(params: {
  bot: Bot;
  interaction: any;
  items: T[];
  title: (pageIndex: number, totalPages: number) => string;
  mapItem: (item: T) => string;
  emptyText?: string;
  pageSize?: number;
  userId?: string;
}) {
  const {
    bot,
    interaction,
    items,
    title,
    mapItem,
    emptyText = 'No Data.',
    pageSize = 10,
    userId = interaction.user?.id?.toString(),
  } = params;

  const paginatorRepo = new PaginatorSessionRepository();
  const paginatorService = new PaginatorService(paginatorRepo);

  const renderer = createTextListRenderer<T>({
    title,
    mapItem,
    emptyText: emptyText ?? 'No Data.',
  });

  await paginatorService.createPaginator(bot, interaction, items, renderer, {
    pageSize,
    userId,
  });
}
