import type { CommandHandler, ComponentHandler } from './internal/router.type';
import type {
  EventHandler,
  EventName,
  StreamBuilder,
} from './internal/events/hub.type';
import type { CommandDef } from './commands.type';
import type {
  Collected,
  CtxFor,
  Feature,
  FeatureSpec,
  HandlerKeyOf,
} from './features.type';

// --- useHandlers ------------------------------------------------------------

export function useHandlers<C extends CommandDef = CommandDef>(_def?: C) {
  const collected: Required<Collected> = {
    handler: {},
    event: {},
    stream: {},
    component: {},
  };

  return {
    handler<K extends HandlerKeyOf<C>>(
      name: K,
      fn: (ctx: CtxFor<C, K>) => unknown | Promise<unknown>
    ): void {
      collected.handler[name] = fn as CommandHandler;
    },
    event<K extends EventName>(name: K, fn: EventHandler<K>): void {
      collected.event[name] = fn as never;
    },
    stream<K extends EventName>(name: K, fn: StreamBuilder<K>): void {
      collected.stream[name] = fn as never;
    },
    component(pattern: string, fn: ComponentHandler): void {
      collected.component[pattern] = fn;
    },
    collect(): Collected {
      return collected;
    },
  };
}

// --- defineFeature ----------------------------------------------------------

export function defineFeature() {
  return <Deps, C extends CommandDef | undefined = undefined>(
    spec: FeatureSpec<Deps, C>
  ): Feature<Deps> => ({
    name: spec.name ?? spec.command?.command ?? '',
    command: spec.command,
    useHandlers: spec.useHandlers,
  });
}
