import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import type { GatewayDispatchPayload } from 'discord-api-types/v10';

export { REST, DiscordAPIError } from '@discordjs/rest';
export { DiscordSnowflake } from '@sapphire/snowflake';
export * as Formatters from '@discordjs/formatters';
export { registerGlobalCommands } from './commands';
export type { GatewayDispatchPayload } from 'discord-api-types/v10';

export interface GatewayConnectOptions {
  intents: number;
  onDispatch: (payload: GatewayDispatchPayload) => void;
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
    async connect({ intents, onDispatch, onLog }) {
      const manager = new WebSocketManager({ token: options.token, intents, rest });
      manager.on(WebSocketShardEvents.Dispatch, (payload) => onDispatch(payload));
      manager.on(WebSocketShardEvents.Debug, (message, shardId) => onLog?.(message, { shardId }));
      await manager.connect();
      return { close: () => void manager.destroy() };
    },
  };
}
