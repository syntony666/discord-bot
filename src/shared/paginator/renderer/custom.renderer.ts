import type { PageRenderResult, PageRenderer } from '../paginator.types';
import type { Renderer } from './renderer.interface';

/**
 * Adapter that wraps an external PageRenderer into the Renderer interface.
 */
export class CustomRenderer<T> implements Renderer<T> {
  constructor(private readonly pageRenderer: PageRenderer<T>) {}

  render(items: T[], pageIndex: number, totalPages: number): PageRenderResult {
    return this.pageRenderer.renderPage(items, pageIndex, totalPages);
  }
}
