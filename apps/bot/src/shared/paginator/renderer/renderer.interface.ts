import type { PageRenderResult } from '../paginator.types';

export interface Renderer<T> {
  render(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}
