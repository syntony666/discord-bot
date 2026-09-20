import type { InteractionDataOption } from '@discordeno/bot';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { KeywordRule, KeywordMatchType } from '@discord-bot/shared';
import type { BotInteraction } from '@core/rx/bus';
import type { KeywordModule } from '@features/keyword/keyword.module';

export interface CommandContext {
  actions: DiscordActions;
  interaction: BotInteraction;
  guildId: string;
  module: KeywordModule;
  subCommand: InteractionDataOption;
}

export interface OverwriteData {
  guildId: string;
  pattern: string;
  matchType: KeywordMatchType;
  response: string;
  editorId: string;
  existingRule: KeywordRule;
}

export interface DeleteData {
  guildId: string;
  pattern: string;
  editorId: string;
  ruleToDelete: KeywordRule;
}
