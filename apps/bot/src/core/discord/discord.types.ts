import type {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
} from 'discord-api-types/v10';

export type MessageComponents = APIActionRowComponent<APIComponentInMessageActionRow>[];

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: CommandOption[];
  focused?: boolean;
}
