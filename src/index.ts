import { appConfig } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma, disconnectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';
import { bootstrapApp } from '@core/bootstrap/app.bootstrap';
import { featureRegistry } from '@core/bootstrap/feature.registry';

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

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

  try {
    // Step 1: Cleanup all features
    featureRegistry.cleanup();

    // Step 2: Disconnect Prisma
    await disconnectPrisma();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

main().catch(async (error) => {
  logger.error({ error }, 'Fatal error in main');
  await disconnectPrisma();
  process.exit(1);
});
