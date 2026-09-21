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
import { createGuildModule } from '@features/guild/guild.module';
import { createKeywordModule } from '@features/keyword/keyword.module';
import { createMemberNotifyModule } from '@features/member-notify/member-notify.module';
import { createReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { createStreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { guildFeature } from '@features/guild/guild.feature';
import { commandRegistry } from '@core/bootstrap/command.registry';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { PaginatorButtonStrategy } from '@shared/paginator/strategy/paginator-button.strategy';
import { reactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { streamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
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

  // ========== Modules ==========
  const guildModule = createGuildModule(request);
  const keywordModule = createKeywordModule(request);
  const memberNotifyModule = createMemberNotifyModule(request);
  const reactionRoleModule = createReactionRoleModule(request);
  const streamNotifyModule = createStreamNotifyModule(request);

  const deps = {
    actions,
    modules: {
      guild: guildModule,
      keyword: keywordModule,
      memberNotify: memberNotifyModule,
      reactionRole: reactionRoleModule,
      streamNotify: streamNotifyModule,
    },
    scheduler,
  };

  const bot = createBot(client, {
    appId: appConfig.discord.appId,
    deps,
    onError: (err) => log.error({ err }, 'Bot dispatch error'),
  });
  // bot.sync() stays off until every command in commands.json is a def.
  bot.register(
    statusFeature,
    keywordFeature,
    memberNotifyFeature,
    guildFeature,
    streamNotifyFeature,
    reactionRoleFeature
  );

  // Activate command registry
  commandRegistry.activate(actions);

  log.info({ featureCount: featureRegistry.count() }, 'Application bootstrapped successfully');

  return { bot, scheduler };
}
