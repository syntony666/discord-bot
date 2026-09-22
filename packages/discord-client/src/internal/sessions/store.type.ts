import type { APIMessage } from 'discord-api-types/v10';
import type { PaginateOptions } from '../../context.type';

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
