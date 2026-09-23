import { Observable, Subject, catchError } from 'rxjs';
import type { GatewayDispatchPayload } from 'discord-api-types/v10';
import type {
  EventHandler,
  EventMap,
  EventName,
  StreamBuilder,
} from './hub.type';

/** 'MESSAGE_CREATE' → 'messageCreate' */
const eventKey = (t: string) =>
  t.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function createEventHub(
  onError: (err: unknown) => void,
  getSelfId: () => string = () => ''
) {
  const subjects = new Map<string, Subject<unknown>>();

  const subjectFor = (key: string) => {
    let s = subjects.get(key);
    if (!s) {
      s = new Subject<unknown>();
      subjects.set(key, s);
    }
    return s;
  };

  const on = <K extends EventName>(name: K, handler: EventHandler<K>) => {
    subjectFor(name).subscribe({
      next: (data) => {
        try {
          const out = handler(data as EventMap[K]);
          void Promise.resolve(out).catch(onError);
        } catch (err) {
          onError(err);
        }
      },
      error: onError,
    });
  };

  const stream = <K extends EventName>(name: K, build: StreamBuilder<K>) => {
    const source = subjectFor(name).asObservable() as Observable<never>;
    build(source)
      .pipe(
        // Resubscribe after errors so one bad event can't kill the stream.
        catchError((err, caught) => {
          onError(err);
          return caught;
        })
      )
      .subscribe({ error: onError });
  };

  const dispatch = (payload: GatewayDispatchPayload) => {
    const s = subjects.get(eventKey(payload.t));
    if (!s) return false;
    // Drop self-originated events (e.g. the bot's own reactions). `user_id`
    // only appears on reaction/typing payloads, so this can't misfire on
    // member or message events.
    const d = payload.d as { user_id?: string };
    if (d.user_id !== undefined && d.user_id === getSelfId()) return true;
    s.next(payload.d);
    return true;
  };

  const close = () => {
    for (const s of subjects.values()) s.complete();
    subjects.clear();
  };

  return { on, stream, dispatch, close };
}

export type EventHub = ReturnType<typeof createEventHub>;
