import type { APIInteraction } from 'discord-api-types/v10';
import type { CommandContext, ComponentContext } from '../context.type';

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;
export type ComponentHandler = (ctx: ComponentContext) => void | Promise<void>;

export interface ComponentRoute {
  pattern: RegExp;
  params: string[];
  handler: ComponentHandler;
}

export interface SessionDispatcher {
  claims(customId: string): boolean;
  dispatch(interaction: APIInteraction): Promise<boolean>;
}
