import { appConfig } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma, disconnectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';
import { bootstrapApp } from '@core/bootstrap/app.bootstrap';

async function main() {
  logger.info({ env: appConfig.nodeEnv }, 'Starting bot');

  try {
    await connectPrisma();

    const { bot, rest, start } = createBotClient();

    await bootstrapApp(bot as any, rest, prisma);

    await start();

    logger.info('Bot started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    await disconnectPrisma();
    process.exit(1);
  }
}

// 優雅關閉處理
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

main().catch(async (error) => {
  logger.error({ error }, 'Fatal error in main');
  await disconnectPrisma();
  process.exit(1);
});
