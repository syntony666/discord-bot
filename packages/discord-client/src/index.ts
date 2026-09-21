import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import type {
  GatewayDispatchPayload,
  GatewayReadyDispatchData,
} from 'discord-api-types/v10';

export { REST, DiscordAPIError } from '@discordjs/rest';
export { DiscordSnowflake } from '@sapphire/snowflake';
export * as Formatters from '@discordjs/formatters';
export { registerGlobalCommands } from './commands/register';
export { defineCommand } from './commands/define';
export { toRestBody } from './commands/serialize';
export { createSessionStore } from './commands/sessions';
export type { SessionStore } from './commands/sessions';
export { createCommandRouter } from './commands/router';
export type {
  CommandHandler,
  CommandRouter,
  ComponentHandler,
} from './commands/router';
export type { CommandRoute, SessionApi } from './commands/context';
export { createEventHub } from './events/hub';
export type { EventHandler, EventHub, StreamBuilder } from './events/hub';
export type { EventMap, EventName } from './events/types';
export { defineFeature, useHandlers } from './features';
export type { Collected, Feature, HandlerKeyOf } from './features';
export type {
  CommandDef,
  OptionChoiceDef,
  OptionDef,
  SubcommandDef,
  SubcommandGroupDef,
} from './commands/types';
export type {
  CommandContext,
  ComponentContext,
  ConfirmOptions,
  ModalField,
  ModalOptions,
  PaginateOptions,
  PromptOptions,
} from './commands/context';
export type { GatewayDispatchPayload } from 'discord-api-types/v10';

export interface GatewayConnectOptions {
  intents: number;
  onDispatch: (payload: GatewayDispatchPayload) => void;
  onReady?: (data: GatewayReadyDispatchData, shardId: number) => void;
  onLog?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface GatewaySession {
  close(): void;
}

export interface DiscordClient {
  rest: REST;
  connect(options: GatewayConnectOptions): Promise<GatewaySession>;
}

export function createDiscordClient(options: { token: string }): DiscordClient {
  const rest = new REST({ version: '10' }).setToken(options.token);
  return {
    rest,
    async connect({ intents, onDispatch, onReady, onLog }) {
      const manager = new WebSocketManager({ token: options.token, intents, rest });
      manager.on(WebSocketShardEvents.Dispatch, (payload) => onDispatch(payload));
      manager.on(WebSocketShardEvents.Ready, (data, shardId) => onReady?.(data, shardId));
      manager.on(WebSocketShardEvents.Debug, (message, shardId) => onLog?.(message, { shardId }));
      await manager.connect();
      return { close: () => void manager.destroy() };
    },
  };
}
