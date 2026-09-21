import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import type {
  GatewayDispatchPayload,
  GatewayReadyDispatchData,
} from 'discord-api-types/v10';
import { createDiscordActions, type DiscordActions } from './actions';

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
  actions: DiscordActions;
  readonly botId: string;
  connect(options: GatewayConnectOptions): Promise<GatewaySession>;
}

export function createDiscordClient(options: {
  token: string;
}): DiscordClient {
  const rest = new REST({ version: '10' }).setToken(options.token);
  let botId = '';
  const actions = createDiscordActions(rest, () => botId);
  return {
    rest,
    actions,
    get botId() {
      return botId;
    },
    async connect({ intents, onDispatch, onReady, onLog }) {
      const manager = new WebSocketManager({ token: options.token, intents, rest });
      manager.on(WebSocketShardEvents.Dispatch, (payload) => onDispatch(payload));
      manager.on(WebSocketShardEvents.Ready, (data, shardId) => {
        botId = data.user.id;
        onReady?.(data, shardId);
      });
      manager.on(WebSocketShardEvents.Debug, (message, shardId) => onLog?.(message, { shardId }));
      await manager.connect();
      return { close: () => void manager.destroy() };
    },
  };
}
