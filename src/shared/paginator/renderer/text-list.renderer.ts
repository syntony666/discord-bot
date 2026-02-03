import { appConfig, CommandColors } from '@core/config';
import type { PageRenderResult } from '../paginator.types';
import type { Renderer } from './renderer.interface';

/**
 * Configuration for the text list renderer.
 */
export interface TextListRendererConfig<T> {
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => string;
  emptyText?: string;
  username?: string;
}

/**
 * Renders a list of items into a single text page (embed description).
 */
export class TextListRenderer<T> implements Renderer<T> {
  constructor(private readonly config: TextListRendererConfig<T>) {}

  render(items: T[], pageIndex: number, totalPages: number): PageRenderResult {
    const { title, mapItem, emptyText = 'No data.', username } = this.config;

    const titleText = typeof title === 'function' ? title(pageIndex, totalPages) : title;
    const description = items.length === 0 ? emptyText : items.map(mapItem).join('\n');

    return {
      embeds: [
        {
          title: titleText,
          description,
          color: CommandColors.INFO,
          footer: {
            text: username as string,
            icon_url: appConfig.footerIconUrl,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
