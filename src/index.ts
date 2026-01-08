import { appConfig } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';
import { bootstrapApp } from '@core/bootstrap/app.bootstrap';

async function main() {
  logger.info({ env: appConfig.nodeEnv }, 'Starting bot');

  await connectPrisma();

  const { bot, rest, start } = createBotClient();

  await bootstrapApp(bot as any, rest, prisma);

  await start();
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in main');
  process.exit(1);
});
