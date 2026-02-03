import { appConfig, CommandColors } from '@core/config';
import type { PageRenderResult } from '../paginator.types';
import type { Renderer } from './renderer.interface';

/**
 * Configuration for the image list renderer.
 */
export interface ImageListRendererConfig<T> {
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => { url: string; description?: string };
  emptyText?: string;
  username?: string;
}

/**
 * Renders a list of items into a single image page (embed description).
 */
export class ImageListRenderer<T> implements Renderer<T> {
  constructor(private readonly config: ImageListRendererConfig<T>) {}

  render(items: T[], pageIndex: number, totalPages: number): PageRenderResult {
    const { title, mapItem, emptyText = 'No images.', username } = this.config;

    const titleText = typeof title === 'function' ? title(pageIndex, totalPages) : title;

    if (items.length === 0) {
      return {
        embeds: [
          {
            title: titleText,
            description: emptyText,
            color: CommandColors.INFO,
          },
        ],
      };
    }

    const item = items[0] as T;
    const mapped = mapItem(item);

    return {
      embeds: [
        {
          title: titleText,
          description: mapped.description,
          image: { url: mapped.url },
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
