import { Bot } from '@discordeno/bot';
import { RestManager } from '@discordeno/rest';
import { PrismaClient } from '@prisma-client/client';
import { setupKeywordFeature } from '@features/keyword/keyword.feature';
import { setupGuildFeature } from '@features/guild/guild.feature';
import { registerApplicationCommands } from '@platforms/discordeno/commands-loader';
import { commandRegistry } from '@core/bootstrap/command.registry';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { PaginatorButtonStrategy } from '@shared/paginator/strategy/paginator-button.strategy';
import { setupMemberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { setupReactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { setupStreamNotifyFeature } from '@features/stream-notify/stream-notify.feature';
import { setupStatusCommand } from '@commands/status/status.command';
import { setupKeywordCommand } from '@commands/keyword/keyword.command';
import { setupMemberNotifyCommand } from '@commands/member-notify/member-notify.command';
import { setupReactionRoleCommand } from '@commands/reaction-role/reaction-role.command';
import { setupStreamNotifyCommand } from '@commands/stream-notify/stream-notify.command';
import { ConfirmationStrategy } from '@shared/confirmation/confirmation.strategy';
import { CustomIdPrefixes } from '@core/config/constants';
import { featureRegistry } from './feature.registry';
import { createSchedulerService } from '@core/scheduler';

const log = createLogger('Bootstrap');

/**
 * Bootstrap application.
 * Initializes features in dependency order: Guild → Other Features
 */
export async function bootstrapApp(bot: Bot, rest: RestManager, prisma: PrismaClient) {
  log.info('Bootstrapping application...');

  ready$.subscribe(({ user }) => {
    log.info({ user }, 'Bot is ready');
  });

  await registerApplicationCommands(rest);

  // Create and start scheduler
  const scheduler = createSchedulerService();
  scheduler.start();

  // Register interaction strategies
  const paginatorButtonStrategy = new PaginatorButtonStrategy();
  const confirmationStrategy = new ConfirmationStrategy();

  commandRegistry.registerCustomIdHandler(
    `${CustomIdPrefixes.PAGINATOR}:`,
    async (interaction, bot) => {
      if (interaction.data?.customId?.endsWith(':jump')) {
        await paginatorButtonStrategy.handleModalSubmit(bot, interaction);
      } else {
        await paginatorButtonStrategy.handle(bot, interaction);
      }
    }
  );

  commandRegistry.registerCustomIdHandler('confirm:', async (interaction, bot) => {
    await confirmationStrategy.handle(bot, interaction);
  });

  // ========== Setup Guild Feature FIRST ==========
  const guildFeature = setupGuildFeature(prisma, bot);
  featureRegistry.register(guildFeature);

  // ========== Setup other features (pass guildModule) ==========
  const keywordFeature = setupKeywordFeature(prisma, bot, guildFeature.module);
  const memberNotifyFeature = setupMemberNotifyFeature(prisma, bot, guildFeature.module);
  const reactionRoleFeature = setupReactionRoleFeature(prisma, bot, guildFeature.module);
  const streamNotifyFeature = setupStreamNotifyFeature(prisma, bot, scheduler);

  featureRegistry.register(keywordFeature);
  featureRegistry.register(memberNotifyFeature);
  featureRegistry.register(reactionRoleFeature);
  featureRegistry.register(streamNotifyFeature);

  // Register commands
  commandRegistry.register(
    'status',
    setupStatusCommand({
      memberNotify: memberNotifyFeature.module,
      streamNotify: streamNotifyFeature.module,
      keyword: keywordFeature.module,
      reactionRole: reactionRoleFeature.module,
    })
  );
  commandRegistry.register('keyword', setupKeywordCommand(keywordFeature.module));
  commandRegistry.register(
    'member-notify',
    setupMemberNotifyCommand(
      memberNotifyFeature.module,
      guildFeature.module,
      memberNotifyFeature.service
    )
  );
  commandRegistry.register(
    'reaction-role',
    setupReactionRoleCommand(reactionRoleFeature.module, reactionRoleFeature.service)
  );
  commandRegistry.register('stream-notify', setupStreamNotifyCommand(streamNotifyFeature.module));

  // Activate command registry
  commandRegistry.activate(bot);

  log.info({ featureCount: featureRegistry.count() }, 'Application bootstrapped successfully');
}
