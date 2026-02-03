import type { DiscordEmbed } from '@discordeno/bot';

/**
 * Supported paginator variants.
 */
export enum PaginatorType {
  TEXT_LIST = 'TEXT_LIST',
  IMAGE_LIST = 'IMAGE_LIST',
  CUSTOM = 'CUSTOM',
}

/**
 * Result of rendering a single page.
 */
export interface PageRenderResult {
  content?: string;
  embeds?: DiscordEmbed[];
  footer?: {
    text: string;
    iconUrl?: string;
  };
}

/**
 * Low-level page renderer used by custom paginators.
 */
export interface PageRenderer<T> {
  renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}

/**
 * In-memory paginator session persisted between button clicks.
 */
export interface PaginatorSession<T = any> {
  id: string;
  pages: PageRenderResult[];
  currentPage: number;
  totalPages: number;
  expiresAt: number;
  messageToken: string;
  interactionId: bigint;
  userId?: string;
}

/**
 * Common options shared by all paginator variants.
 */
interface BasePaginatorOptions<T> {
  bot: any;
  interaction: any;
  items: T[];
  pageSize?: number;
  userId?: string;
}

/**
 * Options for text list paginator.
 */
export interface TextListOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.TEXT_LIST;
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => string;
  emptyText?: string;
}

/**
 * Options for image list paginator.
 */
export interface ImageListOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.IMAGE_LIST;
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => { url: string; description?: string };
  emptyText?: string;
}

/**
 * Options for fully custom paginator.
 */
export interface CustomPaginatorOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.CUSTOM;
  renderer: PageRenderer<T>;
}

export type PaginatorOptions<T = any> =
  | TextListOptions<T>
  | ImageListOptions<T>
  | CustomPaginatorOptions<T>;
