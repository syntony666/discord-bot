import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RestManager } from '@discordeno/rest';
import { createLogger } from '@core/logger';
import { appConfig } from '@core/config';

const log = createLogger('CommandsLoader');

export async function registerApplicationCommands(rest: RestManager) {
  const filePath = resolve(__dirname, '../../adapters/discord/commands.json');
  const raw = readFileSync(filePath, 'utf-8');
  const commands = JSON.parse(raw);

  log.info({ count: commands.length }, 'Registering application commands');

  await rest.put(`/applications/${appConfig.discord.appId}/commands`, {
    body: commands,
  });

  log.info('Application commands registered');
}
