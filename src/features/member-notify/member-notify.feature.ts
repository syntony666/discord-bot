import { PrismaClient } from '@prisma-client/client';
import { Bot, logger } from '@discordeno/bot';
import { Subscription, lastValueFrom, mergeMap } from 'rxjs';
import { createMemberNotifyModule, MemberNotifyModule } from './member-notify.module';
import { createMemberNotifyService, MemberNotifyService } from './member-notify.service';
import { BotGuild, guildMemberAdd$, guildMemberRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { createMemberNotifyCommandHandler } from '@adapters/discord/commands/member-notify.command';
import { notify } from '@adapters/discord/shared/message/message.helper';

const log = createLogger('MemberNotifyFeature');

export interface MemberNotifyFeature {
  module: MemberNotifyModule;
  service: MemberNotifyService;
  cleanup: () => void;
}

/**
 * Setup member join/leave notification feature.
 * Subscribes to member events and sends notifications based on config.
 */
export function setupMemberNotifyFeature(prisma: PrismaClient, bot: Bot): MemberNotifyFeature {
  const module = createMemberNotifyModule(prisma);
  const service = createMemberNotifyService();

  createMemberNotifyCommandHandler(bot, module, service);

  const subscriptions: Subscription[] = [];

  // Handle member join events
  const joinSub = guildMemberAdd$
    .pipe(
      mergeMap(async ({ member, user }) => {
        const guildId = member.guildId.toString();
        const config = await lastValueFrom(module.getConfig$(guildId));

        if (!service.shouldSendJoin(config)) return;

        try {
          const guild = (await bot.helpers.getGuild(member.guildId)) as BotGuild;
          const memberCount = guild.approximateMemberCount || 0;
          logger.info('Member count after leave: ' + guild.approximateMemberCount);

          const message = service.formatMessage(config!.joinMessage, {
            user: `<@${user.id}>`,
            username: user.username || 'Unknown',
            server: guild.name,
            memberCount,
          });

          await notify(bot, BigInt(config!.channelId!), {
            type: 'member_join',
            title: '新成員加入',
            description: message,
          });

          log.info({ guildId, userId: user.id.toString() }, 'Sent join notification');
        } catch (error) {
          log.error({ error, guildId }, 'Failed to send join notification');
        }
      })
    )
    .subscribe();

  // Handle member leave events
  const leaveSub = guildMemberRemove$
    .pipe(
      mergeMap(async ({ user, guildId }) => {
        const guildIdStr = guildId.toString();
        const config = await lastValueFrom(module.getConfig$(guildIdStr));

        if (!service.shouldSendLeave(config)) return;

        try {
          const guild = (await bot.helpers.getGuild(guildIdStr)) as BotGuild;
          const memberCount = guild.approximateMemberCount || 0;

          logger.info('Member count after leave: ' + guild.approximateMemberCount);

          const message = service.formatMessage(config!.leaveMessage, {
            user: `<@${user.id}>`,
            username: user.username || 'Unknown',
            server: guild.name,
            memberCount,
          });

          await notify(bot, BigInt(config!.channelId!), {
            type: 'member_leave',
            title: '成員離開',
            description: message,
          });

          log.info({ guildId: guildIdStr, userId: user.id.toString() }, 'Sent leave notification');
        } catch (error) {
          log.error({ error, guildId: guildIdStr }, 'Failed to send leave notification');
        }
      })
    )
    .subscribe();

  subscriptions.push(joinSub, leaveSub);

  log.info('Member notify feature activated');

  return {
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Member notify feature cleaned up');
    },
  };
}
