import { PrismaClient } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { Subscription, lastValueFrom, mergeMap, catchError, EMPTY } from 'rxjs';
import { createMemberNotifyModule, MemberNotifyModule } from './member-notify.module';
import { createMemberNotifyService, MemberNotifyService } from './member-notify.service';
import { BotGuild, guildMemberAdd$, guildMemberRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { createMemberNotifyCommandHandler } from '@adapters/discord/commands/member-notify.command';
import { notify } from '@adapters/discord/shared/message/message.helper';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';

const log = createLogger('MemberNotifyFeature');

export interface MemberNotifyFeature {
  module: MemberNotifyModule;
  service: MemberNotifyService;
  cleanup: () => void;
}

/**
 * Setup member join/leave notification feature.
 * Uses mergeMap for parallel processing since notifications are independent.
 */
export function setupMemberNotifyFeature(prisma: PrismaClient, bot: Bot): MemberNotifyFeature {
  const module = createMemberNotifyModule(prisma);
  const service = createMemberNotifyService();

  createMemberNotifyCommandHandler(bot, module, service);

  const subscriptions: Subscription[] = [];

  // Handle member join events
  const joinSub = guildMemberAdd$
    .pipe(
      (mergeMap(async ({ member, user }) => {
        const guildId = member.guildId.toString();
        const config = await lastValueFrom(module.getConfig$(guildId));

        if (!service.shouldSendJoin(config)) return;

        const guild = (await bot.helpers.getGuild(member.guildId)) as BotGuild;
        const memberCount = guild.approximateMemberCount || 0;

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
      }),
      handleDiscordError({
        operation: 'memberJoinNotify',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in member-notify join stream (outer catchError)');
        return EMPTY;
      }))
    )
    .subscribe();

  // Handle member leave events
  const leaveSub = guildMemberRemove$
    .pipe(
      (mergeMap(async ({ user, guildId }) => {
        const guildIdStr = guildId.toString();
        const config = await lastValueFrom(module.getConfig$(guildIdStr));

        if (!service.shouldSendLeave(config)) return;

        const guild = (await bot.helpers.getGuild(guildId.toString())) as BotGuild;
        const memberCount = guild.approximateMemberCount || 0;

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
      }),
      handleDiscordError({
        operation: 'memberLeaveNotify',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in member-notify leave stream (outer catchError)');
        return EMPTY;
      }))
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
