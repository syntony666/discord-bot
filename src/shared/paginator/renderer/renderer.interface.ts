import type { PageRenderResult } from '../paginator.types';

/**
 * Minimal interface implemented by all page renderers.
 */
export interface Renderer<T> {
  render(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}
