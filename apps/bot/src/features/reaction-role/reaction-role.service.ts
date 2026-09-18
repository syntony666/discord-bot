import { ReactionRoleModule, ReactionRoleMatch } from './reaction-role.module';
import { Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { normalizeEmojiFromReaction } from './internal/emoji.helper';
import { createLogger } from '@core/logger';

const log = createLogger('ReactionRoleService');

export interface ReactionRoleService {
  findMatch$(
    guildId: string,
    messageId: string,
    emoji: string
  ): Observable<ReactionRoleMatch | null>;
  normalizeEmoji(emoji: { id?: bigint; name?: string }): string;
}

export function createReactionRoleService(module: ReactionRoleModule): ReactionRoleService {
  return {
    findMatch$(guildId: string, messageId: string, emoji: string) {
      log.debug({ guildId, messageId, emoji }, 'Finding reaction role match');

      return module.getReactionRole$(guildId, messageId, emoji).pipe(
        tap((reactionRole) => {
          log.debug(
            { guildId, messageId, emoji, reactionRole: !!reactionRole },
            'Reaction role query result'
          );
        }),
        mergeMap((reactionRole) => {
          if (!reactionRole) {
            log.debug({ guildId, messageId, emoji }, 'No reaction role found');
            return of(null);
          }

          return module.getPanel$(guildId, messageId).pipe(
            tap((panel) => {
              log.debug(
                { guildId, messageId, panel: !!panel, mode: panel?.mode },
                'Panel query result'
              );
            }),
            map((panel) => ({
              roleId: reactionRole.roleId,
              mode: (panel?.mode || 'NORMAL') as 'NORMAL' | 'UNIQUE' | 'VERIFY',
            }))
          );
        })
      );
    },

    normalizeEmoji(emoji: { id?: bigint; name?: string }): string {
      const normalized = normalizeEmojiFromReaction(emoji);
      log.debug({ input: emoji, normalized }, 'Emoji normalized');
      return normalized;
    },
  };
}
