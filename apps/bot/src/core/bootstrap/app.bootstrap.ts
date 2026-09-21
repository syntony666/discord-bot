import { createRequest } from '@discord-bot/shared';
import { createBot } from '@discord-bot/discord-client';
import type { DiscordClient } from '@discord-bot/discord-client';
import { statusFeature } from '@features/status/status.feature';
import { keywordFeature } from '@features/keyword/keyword.feature';
import { memberNotifyFeature } from '@features/member-notify/member-notify.feature';
import type { DiscordActions } from '@core/discord/discord-actions';
import { interactionCustomId } from '@core/discord/interaction.helpers';
import { registerApplicationCommands } from '@platforms/discord/commands-loader';
import { appConfig } from '@core/config';
import { createHttpGuildModule } from '@features/guild/guild.http-module';
import { createHttpKeywordModule } from '@features/keyword/keyword.http-module';
import { createHttpMemberNotifyModule } from '@features/member-notify/member-notify.http-module';
import { createHttpReactionRoleModule } from '@features/reaction-role/reaction-role.http-module';
import { createHttpStreamNotifyModule } from '@features/stream-notify/stream-notify.http-module';
import { setupGuildFeature } from '@features/guild/guild.feature';
import { commandRegistry } from '@core/bootstrap/command.registry';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { PaginatorButtonStrategy } from '@shared/paginator/strategy/paginator-button.strategy';
import { setupReactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { setupStreamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
import { setupReactionRoleCommand } from '@commands/reaction-role/reaction-role.command';
import { setupStreamNotifyCommand } from '@commands/stream-notify/stream-notify.command';
import { ConfirmationStrategy } from '@shared/confirmation/confirmation.strategy';
import { CustomIdPrefixes } from '@core/config/constants';
import { featureRegistry } from './feature.registry';
import { createSchedulerService } from '@core/scheduler';

const log = createLogger('Bootstrap');

export async function bootstrapApp(actions: DiscordActions, client: DiscordClient) {
  log.info('Bootstrapping application...');

  const request = createRequest(appConfig.api.url);

  ready$.subscribe(({ user }) => {
    log.info({ user }, 'Bot is ready');
  });

  await registerApplicationCommands(client);

  // Create and start scheduler
  const scheduler = createSchedulerService();
  scheduler.start();

  // Register interaction strategies
  const paginatorButtonStrategy = new PaginatorButtonStrategy();
  const confirmationStrategy = new ConfirmationStrategy();

  commandRegistry.registerCustomIdHandler(
    `${CustomIdPrefixes.PAGINATOR}:`,
    async (interaction, actions) => {
      if (interactionCustomId(interaction)?.endsWith(':jump')) {
        await paginatorButtonStrategy.handleModalSubmit(actions, interaction);
      } else {
        await paginatorButtonStrategy.handle(actions, interaction);
      }
    }
  );

  commandRegistry.registerCustomIdHandler('confirm:', async (interaction, actions) => {
    await confirmationStrategy.handle(actions, interaction);
  });

  // ========== Setup Guild Feature FIRST ==========
  const guildFeature = setupGuildFeature(createHttpGuildModule(request), actions);
  featureRegistry.register(guildFeature);

  // ========== Setup other features (pass guildModule) ==========
  const keywordModule = createHttpKeywordModule(request);
  const memberNotifyModule = createHttpMemberNotifyModule(request);
  const reactionRoleFeature = setupReactionRoleFeature(
    createHttpReactionRoleModule(request),
    actions,
    guildFeature.module
  );
  const streamNotifyFeature = setupStreamNotifyFeature(
    createHttpStreamNotifyModule(request),
    actions,
    scheduler
  );

  featureRegistry.register(reactionRoleFeature);
  featureRegistry.register(streamNotifyFeature);

  const deps = {
    actions,
    modules: {
      guild: guildFeature.module,
      keyword: keywordModule,
      memberNotify: memberNotifyModule,
      reactionRole: reactionRoleFeature.module,
      streamNotify: streamNotifyFeature.module,
    },
  };

  const bot = createBot(client, {
    appId: appConfig.discord.appId,
    deps,
    onError: (err) => log.error({ err }, 'Bot dispatch error'),
  });
  // bot.sync() stays off until every command in commands.json is a def.
  bot.register(statusFeature, keywordFeature, memberNotifyFeature);

  // Register commands
  commandRegistry.register(
    'reaction-role',
    setupReactionRoleCommand(reactionRoleFeature.module, reactionRoleFeature.service)
  );
  commandRegistry.register('stream-notify', setupStreamNotifyCommand(streamNotifyFeature.module));

  // Activate command registry
  commandRegistry.activate(actions);

  log.info({ featureCount: featureRegistry.count() }, 'Application bootstrapped successfully');

  return { bot };
}
