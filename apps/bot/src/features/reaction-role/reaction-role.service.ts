import { ReactionRoleApi, ReactionRoleMatch } from './reaction-role.api';
import { normalizeEmojiFromReaction } from './internal/emoji.helper';
import { createLogger } from '@discord-bot/shared';

const log = createLogger('ReactionRoleService');

export interface ReactionRoleService {
  findMatch(
    guildId: string,
    messageId: string,
    emoji: string
  ): Promise<ReactionRoleMatch | null>;
  normalizeEmoji(emoji: {
    id?: string | null;
    name?: string | null;
    animated?: boolean | null;
  }): string;
}

export function createReactionRoleService(api: ReactionRoleApi): ReactionRoleService {
  return {
    async findMatch(guildId: string, messageId: string, emoji: string) {
      log.debug({ guildId, messageId, emoji }, 'Finding reaction role match');

      // Legacy rows store `name:id` without the animated prefix
      const reactionRole =
        (await api.getReactionRole(guildId, messageId, emoji)) ??
        (emoji.startsWith('a:')
          ? await api.getReactionRole(guildId, messageId, emoji.slice(2))
          : null);
      log.debug(
        { guildId, messageId, emoji, reactionRole: !!reactionRole },
        'Reaction role query result'
      );
      if (!reactionRole) {
        log.debug({ guildId, messageId, emoji }, 'No reaction role found');
        return null;
      }

      const panel = await api.getPanel(guildId, messageId);
      log.debug(
        { guildId, messageId, panel: !!panel, mode: panel?.mode },
        'Panel query result'
      );
      return {
        roleId: reactionRole.roleId,
        mode: (panel?.mode || 'NORMAL') as 'NORMAL' | 'UNIQUE' | 'VERIFY',
      };
    },

    normalizeEmoji(emoji: {
      id?: string | null;
      name?: string | null;
      animated?: boolean | null;
    }): string {
      const normalized = normalizeEmojiFromReaction(emoji);
      log.debug({ input: emoji, normalized }, 'Emoji normalized');
      return normalized;
    },
  };
}
