import {
  Routes,
  type RESTPutAPIApplicationCommandsJSONBody,
  type RESTPutAPIApplicationCommandsResult,
} from 'discord-api-types/rest/v10';
import type { REST } from '@discordjs/rest';

export async function registerGlobalCommands(
  rest: REST,
  applicationId: string,
  commands: RESTPutAPIApplicationCommandsJSONBody
): Promise<RESTPutAPIApplicationCommandsResult> {
  return rest.put(Routes.applicationCommands(applicationId), {
    body: commands,
  }) as Promise<RESTPutAPIApplicationCommandsResult>;
}
