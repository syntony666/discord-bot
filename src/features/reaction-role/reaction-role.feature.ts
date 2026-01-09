import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { Subscription, mergeMap, lastValueFrom } from 'rxjs';
import { createReactionRoleModule, ReactionRoleModule } from './reaction-role.module';
import { createReactionRoleService, ReactionRoleService } from './reaction-role.service';
import { createReactionRoleCommandHandler } from '@adapters/discord/commands/reaction-role.command';
import { reactionAdd$, reactionRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';

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

        let match;
        try {
          match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
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
        } catch (error: any) {
          if (error.code === 50013) {
            log.warn(
              {
                guildId,
                roleId: match?.roleId,
                error: error.message,
              },
              'Missing permission to manage roles'
            );
          } else if (error.code === 50001) {
            log.warn(
              {
                guildId,
                channelId: reaction.channelId.toString(),
                error: error.message,
              },
              'Missing access to channel'
            );
          } else if (error.code === 10011) {
            log.warn(
              {
                guildId,
                roleId: match?.roleId,
                error: error.message,
              },
              'Role not found'
            );
          } else if (error.code === 10008) {
            log.warn(
              {
                guildId,
                messageId,
                error: error.message,
              },
              'Message not found (panel may have been deleted)'
            );
          } else {
            log.error({ error, guildId, messageId, emoji }, 'Failed to grant role');
          }
        }
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

        let match;
        try {
          match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
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
        } catch (error: any) {
          if (error.code === 50013) {
            log.warn(
              {
                guildId,
                roleId: match?.roleId,
                error: error.message,
              },
              'Missing permission to manage roles'
            );
          } else if (error.code === 10011) {
            log.warn(
              {
                guildId,
                roleId: match?.roleId,
                error: error.message,
              },
              'Role not found'
            );
          } else {
            log.error({ error, guildId, messageId, emoji }, 'Failed to remove role');
          }
        }
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
