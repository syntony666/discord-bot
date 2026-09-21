import '@discord-bot/shared';
import { createDiscordClient, type GatewaySession } from '@discord-bot/discord-client';
import { appConfig, botIntents } from '@core/config';
import { logger } from '@core/logger';
import { bootstrapApp } from '@core/bootstrap/app.bootstrap';
import { startHealthServer, HealthServer } from '@core/health/health.server';
import { buildStatusPayload } from '@core/health/status.provider';
import { createDiscordActions } from '@platforms/discord/discord-actions.adapter';
import { handleGatewayDispatch } from '@platforms/discord/gateway.events';
import { emitReady } from '@core/rx/bus';

let healthServer: HealthServer | null = null;
let gatewaySession: GatewaySession | null = null;
let appScheduler: { stop(): void } | null = null;

async function main() {
  logger.info({ env: appConfig.nodeEnv }, 'Starting bot');

  try {
    const client = createDiscordClient({ token: appConfig.discord.token });
    const { actions, setBotId } = createDiscordActions(client, appConfig.discord.appId);

    healthServer = startHealthServer(appConfig.health.port, buildStatusPayload);

    const { bot, scheduler } = await bootstrapApp(actions, client);
    appScheduler = scheduler;

    gatewaySession = await client.connect({
      intents: botIntents,
      onDispatch: (payload) => {
        if (!bot.handleDispatch(payload)) handleGatewayDispatch(payload);
      },
      onReady: (data) => {
        setBotId(data.user.id);
        emitReady({ user: data.user, shardId: 0 });
      },
      onLog: (message, meta) => logger.info(meta ?? {}, `[Gateway] ${message}`),
    });

    logger.info('Bot started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

  try {
    appScheduler?.stop();
    gatewaySession?.close();
    gatewaySession = null;

    if (healthServer) {
      await healthServer.close();
      healthServer = null;
    }

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
  process.exit(1);
});
