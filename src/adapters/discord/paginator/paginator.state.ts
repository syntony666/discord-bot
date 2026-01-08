export type PaginatorState = {
  currentPage: number;
  totalPages: number;
  expiresAt: number;
};

export type PaginatorEvent =
  | { type: 'PREV' }
  | { type: 'NEXT' }
  | { type: 'PAGE_CLICK' }
  | { type: 'TIMEOUT' };

export function reducePaginatorState(
  state: PaginatorState,
  event: PaginatorEvent,
  now: number,
  ttlMs: number
): PaginatorState {
  switch (event.type) {
    case 'PREV': {
      const currentPage = Math.max(0, state.currentPage - 1);
      return { ...state, currentPage, expiresAt: now + ttlMs };
    }
    case 'NEXT': {
      const currentPage = Math.min(state.totalPages - 1, state.currentPage + 1);
      return { ...state, currentPage, expiresAt: now + ttlMs };
    }
    case 'PAGE_CLICK': {
      // 目前先只延長 TTL，未來可在這裡接「跳頁」互動
      return { ...state, expiresAt: now + ttlMs };
    }
    case 'TIMEOUT': {
      return state;
    }
  }
}
