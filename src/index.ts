import { config } from '@core/config';
import { logger } from '@core/logger';
import { connectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';

async function main() {
  logger.info({ env: config.nodeEnv }, 'Starting bot');

  await connectPrisma();

  const client = createBotClient();
  await client.start();

  logger.info('Bot start requested');
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in main');
  process.exit(1);
});
