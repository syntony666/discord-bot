import { appConfig } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma, disconnectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';
import { bootstrapApp } from '@core/bootstrap/app.bootstrap';
import { featureRegistry } from '@core/bootstrap/feature.registry';
import { startHealthServer, HealthServer } from '@core/health/health.server';
import { buildStatusPayload } from '@core/health/status.provider';

let healthServer: HealthServer | null = null;

async function main() {
  logger.info({ env: appConfig.nodeEnv }, 'Starting bot');

  try {
    await connectPrisma();

    const { bot, rest, start } = createBotClient();

    healthServer = startHealthServer(appConfig.health.port, buildStatusPayload);

    await bootstrapApp(bot as any, rest, prisma);

    await start();

    logger.info('Bot started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    await disconnectPrisma();
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

  try {
    featureRegistry.cleanup();

    if (healthServer) {
      await healthServer.close();
      healthServer = null;
    }

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
