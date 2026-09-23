import type { Observable } from 'rxjs';
import type { GatewayDispatchEvents, GatewayDispatchPayload } from 'discord-api-types/v10';

type DataForEvent<Member> = GatewayDispatchPayload extends infer D
  ? D extends { t: infer T; d: infer Data }
    ? Member extends T
      ? Data
      : never
    : never
  : never;

/**
 * Gateway dispatch payloads keyed by camelCase event name, derived from the
 * discord-api-types enum + union so new events appear on upgrades.
 * `interactionCreate` is excluded — interactions are routed by the command
 * router, not the event stream.
 */
export type EventMap = {
  [K in keyof typeof GatewayDispatchEvents as Uncapitalize<K> extends 'interactionCreate'
    ? never
    : Uncapitalize<K>]: DataForEvent<(typeof GatewayDispatchEvents)[K]>;
};

export type EventName = keyof EventMap;

export type EventHandler<K extends EventName> = (data: EventMap[K]) => void | Promise<void>;

export type StreamBuilder<K extends EventName> = (
  data$: Observable<EventMap[K]>
) => Observable<unknown>;
