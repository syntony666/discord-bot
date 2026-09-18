import type { DiscordEmbed } from '@discordeno/bot';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';

export enum PaginatorType {
  TEXT_LIST = 'TEXT_LIST',
  IMAGE_LIST = 'IMAGE_LIST',
  CUSTOM = 'CUSTOM',
}

export interface PageRenderResult {
  content?: string;
  embeds?: DiscordEmbed[];
  footer?: {
    text: string;
    iconUrl?: string;
  };
}

export interface PageRenderer<T> {
  renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}

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

interface BasePaginatorOptions<T> {
  bot: Bot;
  interaction: BotInteraction;
  items: T[];
  pageSize?: number;
  userId?: string;
}

export interface TextListOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.TEXT_LIST;
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => string;
  emptyText?: string;
}

export interface ImageListOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.IMAGE_LIST;
  title: string | ((pageIndex: number, totalPages: number) => string);
  mapItem: (item: T) => { url: string; description?: string };
  emptyText?: string;
}

export interface CustomPaginatorOptions<T> extends BasePaginatorOptions<T> {
  type: PaginatorType.CUSTOM;
  renderer: PageRenderer<T>;
}

export type PaginatorOptions<T = any> =
  | TextListOptions<T>
  | ImageListOptions<T>
  | CustomPaginatorOptions<T>;
