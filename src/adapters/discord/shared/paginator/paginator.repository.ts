import { createSignal } from '@core/signals/signal';
import type { PaginatorSession, PaginatorSessionId } from './paginator.types';

const [getSessions, setSessions] = createSignal<Map<PaginatorSessionId, PaginatorSession>>(
  new Map()
);

export class PaginatorSessionRepository {
  get(id: PaginatorSessionId): PaginatorSession | undefined {
    return getSessions().get(id);
  }

  save(session: PaginatorSession): void {
    const mapCopy = new Map(getSessions());
    mapCopy.set(session.id, session);
    setSessions(mapCopy);
  }

  delete(id: PaginatorSessionId): void {
    const mapCopy = new Map(getSessions());
    mapCopy.delete(id);
    setSessions(mapCopy);
  }

  cleanupExpired(now = Date.now()): void {
    const mapCopy = new Map(getSessions());
    let changed = false;
    for (const [id, s] of mapCopy) {
      if (s.expiresAt <= now) {
        mapCopy.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setSessions(mapCopy);
    }
  }
}
