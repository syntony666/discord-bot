import { TextListRenderer } from './renderer/text-list.renderer';
import { ImageListRenderer } from './renderer/image-list.renderer';
import { CustomRenderer } from './renderer/custom.renderer';
import { PaginatorStrategy } from './strategy/paginator.strategy';
import { PaginatorType } from './paginator.types';
import type { PaginatorOptions } from './paginator.types';
import type { Renderer } from './renderer/renderer.interface';

/**
 * Paginator factory
 */
export class PaginatorFactory {
  /**
   * Create paginator strategy
   */
  static createStrategy<T>(options: PaginatorOptions<T>): PaginatorStrategy<T> {
    const renderer = this.createRenderer(options);
    const pageSize = this.getPageSize(options);

    return new PaginatorStrategy({
      bot: options.bot,
      interaction: options.interaction,
      items: options.items,
      renderer,
      pageSize,
      userId: options.userId,
    });
  }

  /**
   * Create renderer
   */
  private static createRenderer<T>(options: PaginatorOptions<T>): Renderer<T> {
    switch (options.type) {
      case PaginatorType.TEXT_LIST:
        return new TextListRenderer({
          title: options.title,
          mapItem: options.mapItem,
          emptyText: options.emptyText,
        });

      case PaginatorType.IMAGE_LIST:
        return new ImageListRenderer({
          title: options.title,
          mapItem: options.mapItem,
          emptyText: options.emptyText,
        });

      case PaginatorType.CUSTOM:
        return new CustomRenderer(options.renderer);

      default:
        throw new Error(`Unknown paginator type: ${(options as any).type}`);
    }
  }

  /**
   * Get page size
   */
  private static getPageSize<T>(options: PaginatorOptions<T>): number {
    if (options.type === PaginatorType.IMAGE_LIST) {
      return options.pageSize ?? 1;
    }
    return options.pageSize ?? 10;
  }
}
