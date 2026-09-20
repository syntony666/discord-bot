import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RESTPutAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import {
  registerGlobalCommands,
  type DiscordClient,
} from '@discord-bot/discord-client';
import { createLogger } from '@core/logger';
import { appConfig } from '@core/config';

const log = createLogger('CommandsLoader');

export async function registerApplicationCommands(client: DiscordClient) {
  const filePath = resolve(__dirname, './commands.json');
  const commands = JSON.parse(readFileSync(filePath, 'utf-8')) as RESTPutAPIApplicationCommandsJSONBody;

  log.info({ count: commands.length }, 'Registering application commands');

  await registerGlobalCommands(client.rest, appConfig.discord.appId, commands);

  log.info('Application commands registered');
}
