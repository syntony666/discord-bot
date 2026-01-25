// src/core/bootstrap/app.bootstrap.ts

import { Bot } from '@discordeno/bot';
import { RestManager } from '@discordeno/rest';
import { PrismaClient } from '@prisma-client/client';
import { setupKeywordFeature } from '@features/keyword/keyword.feature';
import { setupGuildFeature } from '@features/guild/guild.feature';
import { registerApplicationCommands } from '@platforms/discordeno/commands-loader';
import { commandRegistry } from '@adapters/discord/commands/command.registry';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { PaginatorButtonStrategy } from '@adapters/discord/shared/paginator/strategy/paginator-button.strategy';
import { setupMemberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { setupReactionRoleFeature } from '@features/reaction-role/reaction-role.feature';
import { createStatusCommandHandler } from '@adapters/discord/commands/status.command';
import { ConfirmationStrategy } from '@adapters/discord/shared/confirmation/confirmation.strategy';
import { CustomIdPrefixes } from '@core/config/constants';
import { featureRegistry } from './feature.registry';

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
  featureRegistry.register(setupKeywordFeature(prisma, bot, guildFeature.module));
  featureRegistry.register(setupMemberNotifyFeature(prisma, bot, guildFeature.module));
  featureRegistry.register(setupReactionRoleFeature(prisma, bot, guildFeature.module));

  // Register commands
  createStatusCommandHandler(bot);

  // Activate command registry
  commandRegistry.activate(bot);

  log.info({ featureCount: featureRegistry.count() }, 'Application bootstrapped successfully');
}
