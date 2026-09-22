import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type {
  APIAttachment,
  APIInteractionDataResolvedChannel,
  APIRole,
  APIUser,
} from 'discord-api-types/v10';
import type {
  CommandContext,
  ComponentContext,
} from './internal/context';
import type {
  CommandHandler,
  ComponentHandler,
} from './internal/router';
import type { EventHandler, StreamBuilder } from './internal/events/hub';
import type { EventName } from './internal/events/types';
import type { CommandDef, OptionDef } from './commands';

// --- option → TS type mapping ----------------------------------------------

interface OptionValueMap {
  [ApplicationCommandOptionType.Subcommand]: never;
  [ApplicationCommandOptionType.SubcommandGroup]: never;
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Number]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.User]: APIUser;
  [ApplicationCommandOptionType.Channel]: APIInteractionDataResolvedChannel;
  [ApplicationCommandOptionType.Role]: APIRole;
  [ApplicationCommandOptionType.Mentionable]: APIUser | APIRole;
  [ApplicationCommandOptionType.Attachment]: APIAttachment;
}

type MapValue<T> = T extends keyof OptionValueMap ? OptionValueMap[T] : unknown;
type ChoiceValue<P> = P extends { choices: readonly { value: infer V }[] }
  ? V
  : never;
type TypeOf<P> = P extends { type: infer T } ? T : never;

/** Choice values narrow to their literal union when declared. */
type OptionValue<P> =
  | ChoiceValue<P>
  | ([ChoiceValue<P>] extends [never] ? MapValue<TypeOf<P>> : never);

type RequiredOption<T> = T extends { required: true } ? T : never;
type OptionalOption<T> = T extends { required: true } ? never : T;

/** OptionDef[] → `{ pattern: string; note?: string }` */
type OptionsOf<O> = O extends readonly OptionDef[]
  ? {
      [P in RequiredOption<O[number]> as P['name']]: OptionValue<P>;
    } & {
      [P in OptionalOption<O[number]> as P['name']]?: OptionValue<P>;
    }
  : Record<string, unknown>;

// --- def → handler keys / ctx ----------------------------------------------

type SubKeys<C extends CommandDef> =
  C['subcommands'] extends readonly (infer S)[]
    ? S extends { name: infer N extends string }
      ? N
      : never
    : never;

type GroupKeys<C extends CommandDef> =
  C['groups'] extends readonly (infer G)[]
    ? G extends {
          name: infer GN extends string;
          subcommands: readonly (infer S)[];
        }
      ? S extends { name: infer SN extends string }
        ? `${GN}.${SN}`
        : never
      : never
    : never;

/** Valid `h.handler(...)` keys: 'add', 'panel.create', or the command name. */
export type HandlerKeyOf<C extends CommandDef> =
  | SubKeys<C>
  | GroupKeys<C>
  | ([SubKeys<C>, GroupKeys<C>] extends [never, never]
      ? C['command']
      : never);

/** The def a handler key resolves to — a subcommand, a group subcommand,
 *  or the command itself when it has no subcommands. */
type Members<T> = T extends readonly (infer M)[] ? M : never;
type Named<Name> = { name: Name };

type GroupSubcommands<C extends CommandDef, G> =
  Extract<Members<C['groups']>, Named<G>> extends { subcommands: infer Ss }
    ? Ss
    : never;

type HandlerDef<C extends CommandDef, K> =
  | (K extends `${infer G}.${infer S}`
      ? Extract<Members<GroupSubcommands<C, G>>, Named<S>>
      : never)
  | (K extends C['command'] ? C : never)
  | (K extends `${string}.${string}` | C['command']
      ? never
      : Extract<Members<C['subcommands']>, Named<K>>);

type HandlerOptions<C extends CommandDef, K> =
  HandlerDef<C, K> extends { options?: infer O } ? O : undefined;

type SubName<C extends CommandDef, K> =
  | (K extends `${string}.${infer S}` ? S : never)
  | (K extends `${string}.${string}` | C['command'] ? never : K & string);

type GroupName<K> = K extends `${infer G}.${string}` ? G : never;

type CtxFor<C extends CommandDef, K> = CommandContext<
  OptionsOf<HandlerOptions<C, K>>,
  SubName<C, K>,
  GroupName<K>
>;

// --- collected shape --------------------------------------------------------

export interface Collected {
  handler?: Record<string, CommandHandler>;
  event?: { [K in EventName]?: EventHandler<K> };
  stream?: { [K in EventName]?: StreamBuilder<K> };
  component?: Record<string, ComponentHandler>;
}

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

export interface Feature<Deps = unknown> {
  name: string;
  command?: CommandDef;
  useHandlers(deps: Deps): Collected;
}

type FeatureSpec<Deps, C> = C extends CommandDef
  ? {
      /** Defaults to `command.command`; if given it must equal it. */
      name?: C['command'];
      command: C;
      useHandlers(deps: Deps): Collected;
    }
  : {
      name: string;
      command?: undefined;
      useHandlers(deps: Deps): Collected;
    };

export function defineFeature() {
  return <Deps, C extends CommandDef | undefined = undefined>(
    spec: FeatureSpec<Deps, C>
  ): Feature<Deps> => ({
    name: spec.name ?? spec.command?.command ?? '',
    command: spec.command,
    useHandlers: spec.useHandlers,
  });
}
