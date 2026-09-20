import type { DiscordActions } from '@core/discord/discord-actions';
import { Subscription, concatMap, lastValueFrom, catchError, EMPTY } from 'rxjs';
import { ReactionRoleModule } from './reaction-role.module';
import { createReactionRoleService, ReactionRoleService } from './reaction-role.service';
import { reactionAdd$, reactionRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';
import { Feature } from '@core/bootstrap/feature.interface';
import { GuildModule } from '@features/guild/guild.module';

const log = createLogger('ReactionRoleFeature');

export interface ReactionRoleFeature extends Feature {
  module: ReactionRoleModule;
  service: ReactionRoleService;
}

export function setupReactionRoleFeature(
  module: ReactionRoleModule,
  actions: DiscordActions,
  guildModule: GuildModule
): ReactionRoleFeature {
  const service = createReactionRoleService(module);

  const subscriptions: Subscription[] = [];

  const addSub = reactionAdd$
    .pipe(
      concatMap(async (reaction) => {
        if (reaction.user_id === actions.botId) return;
        if (!reaction.guild_id) return;

        const guildId = reaction.guild_id;
        const messageId = reaction.message_id;
        const emoji = service.normalizeEmoji(reaction.emoji);

        console.log({ guildId, messageId, emoji });

        const match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
        if (!match) return;

        // UNIQUE mode: remove other roles and reactions FIRST
        if (match.mode === 'UNIQUE') {
          const allRoles = await lastValueFrom(
            module.getReactionRolesByMessage$(guildId, messageId)
          );

          for (const role of allRoles) {
            if (role.roleId !== match.roleId) {
              // Remove other roles
              await actions
                .removeRole(reaction.guild_id, reaction.user_id, role.roleId)
                .catch((err) => {
                  log.debug(
                    { error: err, roleId: role.roleId },
                    'Failed to remove role (user may not have it)'
                  );
                });

              // Remove other reactions
              await actions
                .deleteUserReaction(
                  reaction.channel_id,
                  reaction.message_id,
                  reaction.user_id,
                  role.emoji
                )
                .catch((err) => {
                  log.debug(
                    { error: err, emoji: role.emoji },
                    'Failed to remove reaction (may not exist)'
                  );
                });
            }
          }

          log.debug(
            { userId: reaction.user_id },
            'Removed other roles and reactions (UNIQUE mode)'
          );
        }

        // Grant the new role
        await actions.addRole(reaction.guild_id, reaction.user_id, match.roleId);

        log.info(
          {
            guildId,
            userId: reaction.user_id,
            roleId: match.roleId,
            mode: match.mode,
          },
          'Granted role via reaction'
        );

        // VERIFY mode: remove reaction after granting role
        if (match.mode === 'VERIFY') {
          await actions.deleteUserReaction(
            reaction.channel_id,
            reaction.message_id,
            reaction.user_id,
            emoji
          );
          log.debug({ userId: reaction.user_id }, 'Removed reaction (VERIFY mode)');
        }
      }),
      handleDiscordError({
        operation: 'reactionRoleAdd',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in reaction-role add stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  const removeSub = reactionRemove$
    .pipe(
      concatMap(async (reaction) => {
        if (reaction.user_id === actions.botId) return;
        if (!reaction.guild_id) return;

        const guildId = reaction.guild_id;
        const messageId = reaction.message_id;
        const emoji = service.normalizeEmoji(reaction.emoji);

        const match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
        if (!match) return;

        // VERIFY mode does not remove role when reaction is removed
        if (match.mode === 'VERIFY') {
          log.debug({ userId: reaction.user_id }, 'Skipped role removal (VERIFY mode)');
          return;
        }

        await actions.removeRole(reaction.guild_id, reaction.user_id, match.roleId);

        log.info(
          {
            guildId,
            userId: reaction.user_id,
            roleId: match.roleId,
            mode: match.mode,
          },
          'Removed role via reaction'
        );
      }),
      handleDiscordError({
        operation: 'reactionRoleRemove',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in reaction-role remove stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  subscriptions.push(addSub, removeSub);

  log.info('Reaction role feature activated');

  return {
    name: 'ReactionRole',
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Reaction role feature cleaned up');
    },
  };
}
