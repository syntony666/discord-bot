import { ReactionRoleModule } from './reaction-role.module';
import { Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { ReactionRoleMatch } from './reaction-role.types';
import { normalizeEmojiFromReaction } from './emoji.helper';

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
      return module.getReactionRole$(guildId, messageId, emoji).pipe(
        mergeMap((reactionRole) => {
          if (!reactionRole) return of(null);

          return module.getPanel$(guildId, messageId).pipe(
            map((panel) => ({
              roleId: reactionRole.roleId,
              mode: (panel?.mode || 'NORMAL') as 'NORMAL' | 'UNIQUE' | 'VERIFY',
            }))
          );
        })
      );
    },

    normalizeEmoji(emoji: { id?: bigint; name?: string }): string {
      return normalizeEmojiFromReaction(emoji);
    },
  };
}
