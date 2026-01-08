import {
  createBot,
  Intents,
  createDesiredPropertiesObject,
  DesiredPropertiesBehavior,
  type Message,
  CompleteDesiredProperties,
  Interaction,
  createRestManager,
  RestManager,
} from '@discordeno/bot';
import { config } from '@core/config';
import { createLogger } from '@core/logger';
import { interactionCreate$, messageCreate$ } from '@core/rx/bus';

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
    interaction: {
      type: true,
      id: true,
      token: true,
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
      messageCreate(message) {
        messageCreate$.next(message);
      },
      interactionCreate(interaction) {
        interactionCreate$.next(interaction);
      },
    },
  });

  async function start() {
    log.info('Starting Discordeno bot...');
    await bot.start();
    log.info('Discordeno bot.start() resolved');
  }

  const rest = createRestManager({
    token: config.discordToken,
  });

  return { bot, rest, start };
}

export type { BotDesiredProperties };
