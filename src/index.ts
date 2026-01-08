// src/index.ts
import 'dotenv/config';
import { config } from '@core/config';
import { logger } from '@core/logger';
import { prisma, connectPrisma } from '@platforms/database/prisma.client';
import { createBotClient } from '@platforms/discordeno/bot.client';

import { createKeywordModule } from '@features/keyword/keyword.module';
import { createKeywordService } from '@features/keyword/keyword.service';
import { registerMessageHandler } from '@adapters/discord/message.event';

async function main() {
  logger.info({ env: config.nodeEnv }, 'Starting bot');

  await connectPrisma();

  const keywordModule = createKeywordModule(prisma);
  const keywordService = createKeywordService(keywordModule);

  const { bot, start } = createBotClient();

  registerMessageHandler(bot, keywordService);

  await start();
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in main');
  process.exit(1);
});
