import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import { GatewayOpcodes } from 'discord-api-types/v10';
import type { APIUser, GatewayPresenceUpdateData } from 'discord-api-types/v10';
import { createResources } from './internal/resources';
import { createHelpers } from './internal/helpers';
import { createBot } from './bot';
import type { BotOptions } from './bot.type';
import type { GatewayConnectOptions } from './client.type';

export function createDiscordClient(options: { token: string }) {
  const rest = new REST({ version: '10' }).setToken(options.token);
  let botUser: APIUser | null = null;
  let latestPing = 0;
  let manager: WebSocketManager | null = null;
  const resources = createResources(rest, () => botUser);

  const updatePresence = async (data: GatewayPresenceUpdateData) => {
    if (!manager) throw new Error('gateway is not connected');
    const payload = { op: GatewayOpcodes.PresenceUpdate, d: data } as const;
    for (const shardId of await manager.getShardIds()) {
      await manager.send(shardId, payload);
    }
  };

  const helpers = createHelpers(
    rest,
    () => botUser,
    () => latestPing,
    updatePresence
  );

  return {
    async connect({ intents, onDispatch, onReady, onLog }: GatewayConnectOptions) {
      const ws = new WebSocketManager({ token: options.token, intents, rest });
      manager = ws;
      ws.on(WebSocketShardEvents.Dispatch, (payload) => onDispatch(payload));
      ws.on(WebSocketShardEvents.Ready, (data, shardId) => {
        botUser = data.user;
        onReady?.(data, shardId);
      });
      ws.on(WebSocketShardEvents.HeartbeatComplete, (stats) => {
        latestPing = stats.latency;
      });
      ws.on(WebSocketShardEvents.Debug, (message, shardId) => onLog?.(message, { shardId }));
      await ws.connect();
      return { close: () => void ws.destroy() };
    },
    updatePresence,
    createBot: (botOptions: BotOptions) => createBot(resources, botOptions, helpers),
  };
}

export type DiscordClient = Readonly<ReturnType<typeof createDiscordClient>>;
