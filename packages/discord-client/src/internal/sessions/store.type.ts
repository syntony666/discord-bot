import type { APIInteraction, APIMessage } from 'discord-api-types/v10';
import type {
  ConfirmOptions,
  ModalOptions,
  PaginateOptions,
  PromptOptions,
} from '../../context.type';

/** Implemented by the session store (created in store.ts). */
export interface SessionApi {
  confirm(
    interaction: APIInteraction,
    options: ConfirmOptions,
    responded: boolean
  ): Promise<boolean>;
  paginate<T>(
    interaction: APIInteraction,
    options: PaginateOptions<T>,
    responded: boolean
  ): Promise<void>;
  modal(
    interaction: APIInteraction,
    options: ModalOptions,
    responded: boolean
  ): Promise<Record<string, string> | null>;
  prompt(
    interaction: APIInteraction,
    options: PromptOptions,
    responded: boolean
  ): Promise<APIMessage | null>;
  /** Strip all components from a message after ttlMs. */
  expireComponents(token: string, messageId: string, ttlMs: number): void;
}

export type Pending =
  | {
      kind: 'confirm';
      ownerId: string;
      resolve: (ok: boolean) => void;
      timer?: NodeJS.Timeout;
    }
  | {
      kind: 'paginate';
      ownerId: string;
      username: string;
      items: unknown[];
      render: PaginateOptions<unknown>['render'];
      pageSize: number;
      page: number;
      timeoutMs: number;
      token: string;
      messageId: string;
      timer?: NodeJS.Timeout;
    }
  | {
      kind: 'modal';
      resolve: (values: Record<string, string> | null) => void;
      timer?: NodeJS.Timeout;
    };

export type PaginatePending = Extract<Pending, { kind: 'paginate' }>;

export interface Waiter {
  resolve: (msg: APIMessage | null) => void;
  filter?: (msg: APIMessage) => boolean;
  timer?: NodeJS.Timeout;
}
