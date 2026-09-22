import { REST } from '@discordjs/rest';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import type { APIUser } from 'discord-api-types/v10';
import { createResources } from './internal/resources';
import { createHelpers } from './helpers';
import { createBot } from './bot';
import type { BotOptions } from './bot.type';
import type { GatewayConnectOptions } from './client.type';

export function createDiscordClient(options: {
  token: string;
}) {
  const rest = new REST({ version: '10' }).setToken(options.token);
  let botUser: APIUser | null = null;
  const helpers = createHelpers(createResources(rest, () => botUser));
  return {
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
    createBot: <Deps>(botOptions: BotOptions<Deps>) =>
      createBot({ rest, getBotUser: () => botUser }, botOptions),
  };
}

export type DiscordClient = Readonly<ReturnType<typeof createDiscordClient>>;
