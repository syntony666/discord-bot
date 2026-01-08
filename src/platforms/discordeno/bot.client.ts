import { createBot, Intents } from '@discordeno/bot';
import { config } from '@core/config';
import { createLogger } from '@core/logger';
import { messageCreate$ } from '@core/rx/bus';

const log = createLogger('DiscordenoBot');

export function createBotClient() {
  const bot = createBot({
    token: config.discordToken,
    applicationId: BigInt(config.discordAppId),
    intents: Intents.Guilds | Intents.GuildMessages,
    events: {
      ready(_bot, payload) {
        log.info({ user: payload.user }, 'Bot is ready');
      },
      messageCreate(message) {
        messageCreate$.next(message);
      },
    },
  });

  async function start() {
    bot.start();
  }

  return { bot, start };
}
