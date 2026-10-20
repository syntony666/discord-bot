import type {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import type { CommandContext, ComponentContext } from '../context.type';

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

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;
export type ComponentHandler = (ctx: ComponentContext) => void | Promise<void>;

export interface ComponentRoute {
  pattern: RegExp;
  params: string[];
  handler: ComponentHandler;
  /** Restrict the interaction to the user who ran the original command. */
  sameUser?: boolean;
}

export interface SessionDispatcher {
  claims(customId: string): boolean;
  dispatch(interaction: APIInteraction): Promise<boolean>;
}
