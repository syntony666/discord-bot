import { GatewayDispatchEvents } from 'discord-api-types/v10';
import type { GatewayDispatchPayload } from 'discord-api-types/v10';
import { createCommandRouter, handlerKeys } from './internal/router';
import type { Resources } from './internal/resources';
import { toRestBody } from './internal/serialize';
import { createSessionStore } from './internal/sessions/store';
import { createEventHub } from './internal/events/hub';
import { createHelpers } from './internal/helpers';
import type { Bot, BotOptions } from './bot.type';
import type { Collected, Feature } from './features.type';
import type { CommandDef } from './commands.type';

export function createBot(
  resources: Resources,
  options: BotOptions,
  getPing: () => number = () => 0
): Bot {
  const { appId } = options;
  const onError = options.onError ?? ((err) => console.error(err));

  const sessions = createSessionStore(resources, appId, options.theme, onError);
  const router = createCommandRouter(resources, appId, sessions, onError, options.theme);
  const hub = createEventHub(onError, () => resources.botId);
  const discord = createHelpers(resources, getPing);
  const defs: CommandDef[] = [];
  const seen = new Set<string>();

  const validate = (feature: Feature, collected: Collected) => {
    const handlers = Object.keys(collected.handler ?? {});
    if (!feature.command) {
      if (handlers.length) {
        throw new Error(`feature '${feature.name}' registers command handlers without a command`);
      }
      return;
    }
    const missing = handlerKeys(feature.command).filter((k) => !handlers.includes(k));
    if (missing.length) {
      throw new Error(
        `feature '${feature.name}' is missing handlers for /${feature.command.command}: ${missing.join(', ')}`
      );
    }
  };

  const register = (...features: Feature[]) => {
    for (const f of features) {
      if (f.command) {
        if (seen.has(f.command.command)) {
          throw new Error(`duplicate command '${f.command.command}'`);
        }
        seen.add(f.command.command);
      }
      const collected = f.useHandlers({ ...f.deps, discord });
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
    resources
      .application(appId)
      .commands.overwrite(defs.map(toRestBody))
      .then((commands) => {
        discord.setCommandIds(commands);
      });

  const handleDispatch = (payload: GatewayDispatchPayload): boolean => {
    if (payload.t === GatewayDispatchEvents.InteractionCreate) {
      if (!router.claims(payload.d)) return false;
      void router.handle(payload.d);
      return true;
    }
    if (payload.t === GatewayDispatchEvents.MessageCreate && sessions.tryMessage(payload.d)) {
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
