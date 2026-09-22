import type {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
} from 'discord-api-types/v10';

export interface OptionChoiceDef {
  name: string;
  value: string | number;
  name_localizations?: Record<string, string> | null;
}

export interface OptionDef {
  name: string;
  description?: string;
  type: ApplicationCommandOptionType;
  required?: boolean;
  choices?: readonly OptionChoiceDef[];
  autocomplete?: boolean;
  channel_types?: readonly ChannelType[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  name_localizations?: Record<string, string> | null;
  description_localizations?: Record<string, string> | null;
}

export interface SubcommandDef {
  name: string;
  description: string;
  options?: readonly OptionDef[];
  name_localizations?: Record<string, string> | null;
  description_localizations?: Record<string, string> | null;
}

export interface SubcommandGroupDef {
  name: string;
  description: string;
  subcommands: readonly SubcommandDef[];
  name_localizations?: Record<string, string> | null;
  description_localizations?: Record<string, string> | null;
}

export interface CommandDef {
  /** Discord command name (`name` in the REST payload). */
  command: string;
  description: string;
  type?: ApplicationCommandType;
  /** Shortcut for `contexts: [InteractionContextType.Guild]`. Explicit `contexts` wins. */
  guildOnly?: boolean;
  contexts?: readonly InteractionContextType[];
  integration_types?: readonly number[];
  default_member_permissions?: string | number | null;
  nsfw?: boolean;
  name_localizations?: Record<string, string> | null;
  description_localizations?: Record<string, string> | null;
  /** Flat options for commands without subcommands. */
  options?: readonly OptionDef[];
  subcommands?: readonly SubcommandDef[];
  groups?: readonly SubcommandGroupDef[];
}

/**
 * Identity factory preserving literal types (`const C`) so downstream
 * helpers can infer subcommand keys and option names from the schema.
 */
export function defineCommand() {
  return <const C extends CommandDef>(command: C): C => command;
}
