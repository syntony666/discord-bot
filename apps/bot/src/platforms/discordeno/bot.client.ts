import { createBot, createRestManager } from '@discordeno/bot';
import { appConfig } from '@core/config';
import { createLogger } from '@core/logger';
import { createBotOptions } from './bot.config';

const log = createLogger('DiscordenoBot');

export function createBotClient() {
  const bot = createBot(createBotOptions());

  const rest = createRestManager({
    token: appConfig.discord.token,
  });

  async function start() {
    log.info('Starting Discordeno bot...');
    await bot.start();
    log.info('Discordeno bot started');
  }

  return { bot, rest, start };
}
