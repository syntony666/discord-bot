import { Bot } from '@discordeno/bot';
import { createLogger } from '@core/logger';
import type { KeywordRule } from '@prisma-client/client';

const log = createLogger('KeywordOperations');

export async function createKeywordRule(
  bot: Bot,
  module: any,
  guildId: string,
  pattern: string,
  response: string,
  matchType: string
): Promise<void> {
  try {
    await module.createRule$({
      guildId,
      pattern,
      response,
      matchType,
      enabled: true,
    });
    
    log.debug({ guildId, pattern, matchType }, 'Keyword rule created');
  } catch (error) {
    log.error({ error, guildId, pattern }, 'Failed to create keyword rule');
    throw error;
  }
}

export async function updateKeywordRule(
  bot: Bot,
  module: any,
  guildId: string,
  pattern: string,
  response: string,
  matchType: string
): Promise<void> {
  try {
    await module.updateRule$({
      guildId,
      pattern,
      response,
      matchType,
    });
    
    log.debug({ guildId, pattern, matchType }, 'Keyword rule updated');
  } catch (error) {
    log.error({ error, guildId, pattern }, 'Failed to update keyword rule');
    throw error;
  }
}

export async function deleteKeywordRule(
  bot: Bot,
  module: any,
  guildId: string,
  pattern: string
): Promise<void> {
  try {
    await module.deleteRule$(guildId, pattern);
    
    log.debug({ guildId, pattern }, 'Keyword rule deleted');
  } catch (error) {
    log.error({ error, guildId, pattern }, 'Failed to delete keyword rule');
    throw error;
  }
}

/**
 * Get all keyword rules for a guild
 */
export async function getKeywordRules(
  bot: Bot,
  module: any,
  guildId: string
): Promise<KeywordRule[]> {
  try {
    return await module.getRulesByGuild$(guildId);
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get keyword rules');
    throw error;
  }
}
