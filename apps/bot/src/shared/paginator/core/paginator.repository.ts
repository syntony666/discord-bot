import { createSignal } from '@core/signals/signal';
import type { PaginatorSession } from '../paginator.types';

const [getSessions, setSessions] = createSignal<Map<string, PaginatorSession>>(new Map());

export class PaginatorSessionRepository {
  get(id: string): PaginatorSession | undefined {
    return getSessions().get(id);
  }

  save(session: PaginatorSession): void {
    const mapCopy = new Map(getSessions());
    mapCopy.set(session.id, session);
    setSessions(mapCopy);
  }

  delete(id: string): void {
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
