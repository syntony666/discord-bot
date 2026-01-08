import { Embed } from '@discordeno/bot';

export type PageRenderResult = {
  content?: string;
  embeds?: Embed[];
};

export interface PageRenderer<T> {
  renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}

export type PaginatorSessionId = string;

export interface PaginatorSession<T = unknown> {
  id: PaginatorSessionId;
  userId?: string;
  pages: PageRenderResult[];
  currentPage: number;
  totalPages: number;
  expiresAt: number;
  messageToken: string;
  interactionId: bigint;
}
