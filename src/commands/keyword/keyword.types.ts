import type { InteractionDataOption } from '@discordeno/bot';
import type { KeywordRule, KeywordMatchType } from '@prisma-client/client';

/**
 * Command execution context
 */
export interface CommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  subCommand: InteractionDataOption;
}

/**
 * Data structure for keyword overwrite confirmation
 */
export interface OverwriteData {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType;
  response: string;
  editorId: string;
  existingRule: KeywordRule;
}

/**
 * Data structure for keyword delete confirmation
 */
export interface DeleteData {
  guildId: string;
  pattern: string;
  editorId: string;
  ruleToDelete: KeywordRule;
}
