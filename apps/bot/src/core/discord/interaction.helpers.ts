import type {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
  APIModalSubmissionComponent,
} from 'discord-api-types/v10';
import type { BotInteraction } from '@core/rx/bus';
import type { CommandOption } from './discord.types';

export function interactionOptions(interaction: BotInteraction): CommandOption[] | undefined {
  const data = interaction.data;
  return data && 'options' in data ? (data.options as CommandOption[] | undefined) : undefined;
}

export function interactionCustomId(interaction: BotInteraction): string | undefined {
  const data = interaction.data;
  return data && 'custom_id' in data ? data.custom_id : undefined;
}

export function interactionComponents(
  interaction: BotInteraction
):
  | APIActionRowComponent<APIComponentInMessageActionRow>[]
  | APIModalSubmissionComponent[]
  | undefined {
  const data = interaction.data;
  return data && 'components' in data ? data.components : undefined;
}
