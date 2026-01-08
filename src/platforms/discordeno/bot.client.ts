// src/platforms/discordeno/bot.client.ts
import {
  createBot,
  Intents,
  createDesiredPropertiesObject,
  DesiredPropertiesBehavior,
  type Message,
  CompleteDesiredProperties,
} from '@discordeno/bot';
import { config } from '@core/config';
import { createLogger } from '@core/logger';
import { messageCreate$ } from '@core/rx/bus';

const log = createLogger('DiscordenoBot');

const rawDesiredProperties = createDesiredPropertiesObject(
  {
    message: {
      id: true,
      content: true,
      channelId: true,
      guildId: true,
      authorId: true,
    },
    user: {
      id: true,
      username: true,
      toggles: true,
    },
  },
  true
);

interface BotDesiredProperties extends Required<typeof rawDesiredProperties> {}

const desiredProperties = rawDesiredProperties as CompleteDesiredProperties<
  BotDesiredProperties,
  false
>;

export function createBotClient() {
  const bot = createBot({
    token: config.discordToken,
    applicationId: BigInt(config.discordAppId),
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
    desiredPropertiesBehavior: DesiredPropertiesBehavior.RemoveKey,
    desiredProperties,
    events: {
      ready(_bot, payload) {
        log.info({ user: payload.user }, 'Bot is ready');
      },
      messageCreate(message: Message) {
        messageCreate$.next(message as any);
      },
    },
  });

  async function start() {
    bot.start();
  }

  return { bot, start };
}

export type { BotDesiredProperties };
