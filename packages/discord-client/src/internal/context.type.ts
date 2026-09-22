import type {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIMessage,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import type {
  ConfirmOptions,
  ModalOptions,
  PaginateOptions,
  PromptOptions,
} from '../context.type';

/** Implemented by the session store (created in sessions.ts). */
export interface SessionApi {
  confirm(
    interaction: APIInteraction,
    options: ConfirmOptions,
    responded: boolean
  ): Promise<boolean>;
  paginate<T>(
    interaction: APIInteraction,
    options: PaginateOptions<T>,
    responded: boolean
  ): Promise<void>;
  modal(
    interaction: APIInteraction,
    options: ModalOptions,
    responded: boolean
  ): Promise<Record<string, string> | null>;
  prompt(
    interaction: APIInteraction,
    options: PromptOptions,
    responded: boolean
  ): Promise<APIMessage | null>;
}

export type Interaction =
  | APIChatInputApplicationCommandInteraction
  | APIMessageComponentInteraction
  | APIModalSubmitInteraction;

export interface CommandRoute {
  command: string;
  subcommand?: string;
  subcommandGroup?: string;
  options: Record<string, unknown>;
}
