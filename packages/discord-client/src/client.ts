import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import type {
  APIUser,
  GatewayDispatchPayload,
  GatewayReadyDispatchData,
} from 'discord-api-types/v10';
import { createResources } from './internal/resources';
import { createHelpers, type DiscordHelpers } from './helpers';

export interface GatewayConnectOptions {
  intents: number;
  onDispatch: (payload: GatewayDispatchPayload) => void;
  onReady?: (data: GatewayReadyDispatchData, shardId: number) => void;
  onLog?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface GatewaySession {
  close(): void;
}

export function createDiscordClient(options: {
  token: string;
}) {
  const rest = new REST({ version: '10' }).setToken(options.token);
  let botUser: APIUser | null = null;
  const helpers = createHelpers(createResources(rest, () => botUser));
  return {
    rest,
    helpers,
    get botId() {
      return botUser?.id ?? '';
    },
    async connect({ intents, onDispatch, onReady, onLog }: GatewayConnectOptions) {
      const manager = new WebSocketManager({ token: options.token, intents, rest });
      manager.on(WebSocketShardEvents.Dispatch, (payload) => onDispatch(payload));
      manager.on(WebSocketShardEvents.Ready, (data, shardId) => {
        botUser = data.user;
        onReady?.(data, shardId);
      });
      manager.on(WebSocketShardEvents.Debug, (message, shardId) => onLog?.(message, { shardId }));
      await manager.connect();
      return { close: () => void manager.destroy() };
    },
  };
}

export type DiscordClient = Readonly<ReturnType<typeof createDiscordClient>>;
