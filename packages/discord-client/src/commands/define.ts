import type { CommandDef } from './types';

/**
 * Identity factory preserving literal types (`const C`) so downstream
 * helpers can infer subcommand keys and option names from the schema.
 */
export function defineCommand() {
  return <const C extends CommandDef>(command: C): C => command;
}
