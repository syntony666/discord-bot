import type {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
  APIEmbed,
} from 'discord-api-types/v10';

export type DiscordEmbed = APIEmbed;

export type MessageComponents = APIActionRowComponent<APIComponentInMessageActionRow>[];

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: CommandOption[];
  focused?: boolean;
}
