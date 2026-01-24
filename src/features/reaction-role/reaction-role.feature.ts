import { PrismaClient } from '@prisma-client/client';
import { Bot, InteractionTypes } from '@discordeno/bot';
import { Subscription, mergeMap, lastValueFrom, catchError, EMPTY } from 'rxjs';
import { createReactionRoleModule, ReactionRoleModule } from './reaction-role.module';
import { createReactionRoleService, ReactionRoleService } from './reaction-role.service';
import { reactionAdd$, reactionRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { createReactionRoleCommandHandler } from '@adapters/discord/commands/reaction-role';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';

const log = createLogger('ReactionRoleFeature');

export interface ReactionRoleFeature {
  module: ReactionRoleModule;
  service: ReactionRoleService;
  cleanup: () => void;
}

/**
 * Setup reaction role feature.
 * Subscribes to reaction events and manages role assignments based on panel configuration.
 */
export function setupReactionRoleFeature(prisma: PrismaClient, bot: Bot): ReactionRoleFeature {
  const module = createReactionRoleModule(prisma);
  const service = createReactionRoleService(module);

  createReactionRoleCommandHandler(bot, module, service);

  const subscriptions: Subscription[] = [];

  const addSub = reactionAdd$
    .pipe(
      mergeMap(async (reaction) => {
        if (reaction.userId === bot.id) return;
        if (!reaction.guildId) return;

        const guildId = reaction.guildId.toString();
        const messageId = reaction.messageId.toString();
        const emoji = service.normalizeEmoji(reaction.emoji);

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
              await bot.helpers
                .removeRole(reaction.guildId, reaction.userId, BigInt(role.roleId))
                .catch((err) => {
                  log.debug(
                    { error: err, roleId: role.roleId },
                    'Failed to remove role (user may not have it)'
                  );
                });

              // Remove other reactions
              await bot.helpers
                .deleteUserReaction(
                  reaction.channelId,
                  reaction.messageId,
                  reaction.userId.toString(),
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
            { userId: reaction.userId.toString() },
            'Removed other roles and reactions (UNIQUE mode)'
          );
        }

        // Grant the new role
        await bot.helpers.addRole(reaction.guildId, reaction.userId, BigInt(match.roleId));

        log.info(
          {
            guildId,
            userId: reaction.userId.toString(),
            roleId: match.roleId,
            mode: match.mode,
          },
          'Granted role via reaction'
        );

        // VERIFY mode: remove reaction after granting role
        if (match.mode === 'VERIFY') {
          await bot.helpers.deleteUserReaction(
            reaction.channelId,
            reaction.messageId,
            reaction.userId.toString(),
            emoji
          );
          log.debug({ userId: reaction.userId.toString() }, 'Removed reaction (VERIFY mode)');
        }
      };),
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
      mergeMap(async (reaction) => {
        if (reaction.userId === bot.id) return;
        if (!reaction.guildId) return;

        const guildId = reaction.guildId.toString();
        const messageId = reaction.messageId.toString();
        const emoji = service.normalizeEmoji(reaction.emoji);

        const match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
        if (!match) return;

        // VERIFY mode does not remove role when reaction is removed
        if (match.mode === 'VERIFY') {
          log.debug({ userId: reaction.userId.toString() }, 'Skipped role removal (VERIFY mode)');
          return;
        }

        await bot.helpers.removeRole(reaction.guildId, reaction.userId, BigInt(match.roleId));

        log.info(
          {
            guildId,
            userId: reaction.userId.toString(),
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
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Reaction role feature cleaned up');
    },
  };
}
