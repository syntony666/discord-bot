import { config } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';

import { createKeywordModule } from '@features/keyword/keyword.module';
import { createKeywordService } from '@features/keyword/keyword.service';
import { registerMessageHandler } from '@adapters/discord/message.event';
import { registerInteractionHandler } from '@adapters/discord/interaction.event';
import { registerApplicationCommands } from '@platforms/discordeno/commands-loader';

async function main() {
  logger.info({ env: config.nodeEnv }, 'Starting bot');

  await connectPrisma();

  const keywordModule = createKeywordModule(prisma);
  const keywordService = createKeywordService(keywordModule);

  const { bot, rest, start } = createBotClient();

  await registerApplicationCommands(rest);

  registerMessageHandler(bot as any, keywordService);
  registerInteractionHandler(bot as any, { keywordModule, keywordService });

  await start();
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in main');
  process.exit(1);
});
