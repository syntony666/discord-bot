import { Bot } from '@discordeno/bot';
import { RestManager } from '@discordeno/rest';
import { PrismaClient } from '@prisma-client/client';
import { setupKeywordFeature } from '@features/keyword/keyword.feature';
import { registerApplicationCommands } from '@platforms/discordeno/commands-loader';
import { commandRegistry } from '@adapters/discord/commands/command.registry';
import { PaginatorService } from '@adapters/discord/shared/paginator/paginator.service';
import { PaginatorSessionRepository } from '@adapters/discord/shared/paginator/paginator.repository';
import { ready$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';

const log = createLogger('Bootstrap');

export async function bootstrapApp(bot: Bot, rest: RestManager, prisma: PrismaClient) {
  log.info('Bootstrapping application...');

  ready$.subscribe(({ user }) => {
    log.info({ user }, 'Bot is ready');
  });

  await registerApplicationCommands(rest);

  const paginatorRepo = new PaginatorSessionRepository();
  const paginatorService = new PaginatorService(paginatorRepo);
  commandRegistry.registerCustomIdHandler('pg:', (interaction) =>
    paginatorService.handleButton(bot, interaction)
  );

  setupKeywordFeature(prisma, bot);

  commandRegistry.activate(bot);

  log.info('Application bootstrapped successfully');
}
