import { Bot } from '@discordeno/bot';
import { RestManager } from '@discordeno/rest';
import { PrismaClient } from '@prisma-client/client';
import { setupKeywordFeature } from '@features/keyword/keyword.feature';
import { registerApplicationCommands } from '@platforms/discordeno/commands-loader';
import { commandRegistry } from '@adapters/discord/commands/command.registry';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { PaginatorButtonStrategy } from '@adapters/discord/shared/paginator/strategy/paginator-button.strategy';
import { setupMemberNotifyFeature } from '@features/member-notify/member-notify.feature';
import { createMemberNotifyCommandHandler } from '@adapters/discord/commands/member-notify.command';

const log = createLogger('Bootstrap');

export async function bootstrapApp(bot: Bot, rest: RestManager, prisma: PrismaClient) {
  log.info('Bootstrapping application...');

  ready$.subscribe(({ user }) => {
    log.info({ user }, 'Bot is ready');
  });

  await registerApplicationCommands(rest);

  const paginatorButtonStrategy = new PaginatorButtonStrategy();

  commandRegistry.registerCustomIdHandler('pg:', async (interaction, bot) => {
    if (interaction.data?.customId?.endsWith(':jump')) {
      await paginatorButtonStrategy.handleModalSubmit(bot, interaction);
    } else {
      await paginatorButtonStrategy.handle(bot, interaction);
    }
  });

  setupKeywordFeature(prisma, bot);
  setupMemberNotifyFeature(prisma, bot);

  commandRegistry.activate(bot);

  log.info('Application bootstrapped successfully');
}
