import { ReactionRoleModule, ReactionRoleMatch } from './reaction-role.module';
import { normalizeEmojiFromReaction } from './internal/emoji.helper';
import { createLogger } from '@core/logger';

const log = createLogger('ReactionRoleService');

export interface ReactionRoleService {
  findMatch(
    guildId: string,
    messageId: string,
    emoji: string
  ): Promise<ReactionRoleMatch | null>;
  normalizeEmoji(emoji: { id?: string | null; name?: string | null }): string;
}

export function createReactionRoleService(module: ReactionRoleModule): ReactionRoleService {
  return {
    async findMatch(guildId: string, messageId: string, emoji: string) {
      log.debug({ guildId, messageId, emoji }, 'Finding reaction role match');

      const reactionRole = await module.getReactionRole(guildId, messageId, emoji);
      log.debug(
        { guildId, messageId, emoji, reactionRole: !!reactionRole },
        'Reaction role query result'
      );
      if (!reactionRole) {
        log.debug({ guildId, messageId, emoji }, 'No reaction role found');
        return null;
      }

      const panel = await module.getPanel(guildId, messageId);
      log.debug(
        { guildId, messageId, panel: !!panel, mode: panel?.mode },
        'Panel query result'
      );
      return {
        roleId: reactionRole.roleId,
        mode: (panel?.mode || 'NORMAL') as 'NORMAL' | 'UNIQUE' | 'VERIFY',
      };
    },

    normalizeEmoji(emoji: { id?: string | null; name?: string | null }): string {
      const normalized = normalizeEmojiFromReaction(emoji);
      log.debug({ input: emoji, normalized }, 'Emoji normalized');
      return normalized;
    },
  };
}
