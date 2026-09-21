import { GatewayDispatchEvents } from 'discord-api-types/v10';
import type { GatewayDispatchPayload } from 'discord-api-types/v10';
import type { REST } from '@discordjs/rest';
import { createCommandRouter, handlerKeys } from './commands/router';
import { registerGlobalCommands } from './commands/register';
import { toRestBody } from './commands/serialize';
import { createSessionStore } from './commands/sessions';
import { createEventHub } from './events/hub';
import type { Collected, Feature } from './features';
import type { CommandDef } from './commands/types';

export interface BotOptions<Deps> {
  appId: string;
  deps: Deps;
  onError?: (err: unknown) => void;
}

export interface Bot<Deps = unknown> {
  /** Registers features: commands + handlers + events + components in one pass. */
  register(...features: Feature<Deps>[]): void;
  /** Pushes all registered command defs to Discord. */
  sync(): Promise<void>;
  /** Gateway dispatch entry point. Returns true when the payload was claimed. */
  handleDispatch(payload: GatewayDispatchPayload): boolean;
  close(): void;
}

export function createBot<Deps>(
  client: { rest: REST },
  options: BotOptions<Deps>
): Bot {
  const { appId, deps } = options;
  const onError = options.onError ?? ((err) => console.error(err));

  const sessions = createSessionStore(client.rest, appId, onError);
  const router = createCommandRouter(client.rest, appId, sessions, onError);
  const hub = createEventHub(onError);
  const defs: CommandDef[] = [];
  const seen = new Set<string>();

  const validate = (feature: Feature<Deps>, collected: Collected) => {
    const handlers = Object.keys(collected.handler ?? {});
    if (!feature.command) {
      if (handlers.length) {
        throw new Error(
          `feature '${feature.name}' registers command handlers without a command`
        );
      }
      return;
    }
    const missing = handlerKeys(feature.command).filter(
      (k) => !handlers.includes(k)
    );
    if (missing.length) {
      throw new Error(
        `feature '${feature.name}' is missing handlers for /${feature.command.command}: ${missing.join(', ')}`
      );
    }
  };

  const register = (...features: Feature<Deps>[]) => {
    for (const f of features) {
      if (f.command) {
        if (seen.has(f.command.command)) {
          throw new Error(`duplicate command '${f.command.command}'`);
        }
        seen.add(f.command.command);
      }
      const collected = f.useHandlers(deps);
      validate(f, collected);

      if (f.command) {
        router.addCommand(f.command, collected.handler ?? {});
        defs.push(f.command);
      }
      for (const [name, fn] of Object.entries(collected.event ?? {})) {
        hub.on(name as never, fn as never);
      }
      for (const [name, fn] of Object.entries(collected.stream ?? {})) {
        hub.stream(name as never, fn as never);
      }
      for (const [pattern, fn] of Object.entries(collected.component ?? {})) {
        router.addComponent(pattern, fn);
      }
    }
  };

  const sync = () =>
    registerGlobalCommands(client.rest, appId, defs.map(toRestBody)).then(
      () => undefined
    );

  const handleDispatch = (payload: GatewayDispatchPayload): boolean => {
    if (payload.t === GatewayDispatchEvents.InteractionCreate) {
      if (!router.claims(payload.d)) return false;
      void router.handle(payload.d);
      return true;
    }
    if (
      payload.t === GatewayDispatchEvents.MessageCreate &&
      sessions.tryMessage(payload.d)
    ) {
      return true;
    }
    return hub.dispatch(payload);
  };

  const close = () => {
    sessions.close();
    hub.close();
  };

  return { register, sync, handleDispatch, close };
}
