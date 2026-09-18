import { PrismaClient, NotificationType } from '@prisma-client/client';
import { Bot } from '@discordeno/bot';
import { Subscription, lastValueFrom, mergeMap, catchError, EMPTY } from 'rxjs';
import { createMemberNotifyModule, MemberNotifyModule } from './member-notify.module';
import { createMemberNotifyService, MemberNotifyService } from './member-notify.service';
import { BotGuild, guildMemberAdd$, guildMemberRemove$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { notify } from '@shared/message/message.helper';
import { handleDiscordError } from '@core/rx/operators/handle-discord-error';
import { Feature } from '@core/bootstrap/feature.interface';
import { GuildModule } from '@features/guild/guild.module';

const log = createLogger('MemberNotifyFeature');

export interface MemberNotifyFeature extends Feature {
  module: MemberNotifyModule;
  service: MemberNotifyService;
}

export function setupMemberNotifyFeature(
  prisma: PrismaClient,
  bot: Bot,
  guildModule: GuildModule
): MemberNotifyFeature {
  const module = createMemberNotifyModule(prisma);
  const service = createMemberNotifyService();

  const subscriptions: Subscription[] = [];

  // ========== Member Join Event ==========
  const joinSub = guildMemberAdd$
    .pipe(
      mergeMap(async ({ member, user }) => {
        const guildId = member.guildId.toString();

        try {
          // Ensure guild exists
          await lastValueFrom(guildModule.ensureGuild$(guildId));

          // Get join notification channel
          const joinChannel = await lastValueFrom(
            module.getNotificationChannel$(guildId, NotificationType.MEMBER_JOIN)
          );

          if (!service.shouldSendJoin(joinChannel)) return;

          // Get message templates
          const templates = await lastValueFrom(module.getMessageTemplates$(guildId));
          const guild = (await bot.helpers.getGuild(member.guildId)) as BotGuild;
          const memberCount = guild.approximateMemberCount || 0;

          const message = service.formatMessage(
            templates?.joinMessage || '📥 {user} 加入了 {server}！目前共 {memberCount} 位成員',
            {
              user: `<@${user.id}>`,
              username: user.username || 'Unknown',
              server: guild.name,
              memberCount,
            }
          );

          await notify(bot, BigInt(joinChannel!.channelId), {
            type: 'member_join',
            title: '新成員加入',
            description: message,
          });

          log.info({ guildId, userId: user.id.toString() }, 'Sent join notification');
        } catch (error) {
          log.error(
            { error, guildId, userId: user.id.toString() },
            'Failed to send join notification'
          );
        }
      }),
      handleDiscordError({
        operation: 'memberJoinNotify',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in member-notify join stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  // ========== Member Leave Event ==========
  const leaveSub = guildMemberRemove$
    .pipe(
      mergeMap(async ({ user, guildId }) => {
        const guildIdStr = guildId.toString();

        try {
          // Get leave notification channel
          const leaveChannel = await lastValueFrom(
            module.getNotificationChannel$(guildIdStr, NotificationType.MEMBER_LEAVE)
          );

          if (!service.shouldSendLeave(leaveChannel)) return;

          // Get message templates
          const templates = await lastValueFrom(module.getMessageTemplates$(guildIdStr));
          const guild = (await bot.helpers.getGuild(guildIdStr)) as BotGuild;
          const memberCount = guild.approximateMemberCount || 0;

          const message = service.formatMessage(
            templates?.leaveMessage ||
              '📤 {username} 離開了 {server}。目前剩餘 {memberCount} 位成員',
            {
              user: `<@${user.id}>`,
              username: user.username || 'Unknown',
              server: guild.name,
              memberCount,
            }
          );

          await notify(bot, BigInt(leaveChannel!.channelId), {
            type: 'member_leave',
            title: '成員離開',
            description: message,
          });

          log.info({ guildId: guildIdStr, userId: user.id.toString() }, 'Sent leave notification');
        } catch (error) {
          log.error(
            { error, guildId: guildIdStr, userId: user.id.toString() },
            'Failed to send leave notification'
          );
        }
      }),
      handleDiscordError({
        operation: 'memberLeaveNotify',
      }),
      catchError((error) => {
        log.error({ error }, 'Critical error in member-notify leave stream (outer catchError)');
        return EMPTY;
      })
    )
    .subscribe();

  subscriptions.push(joinSub, leaveSub);

  log.info('Member notify feature activated');

  return {
    name: 'MemberNotify',
    module,
    service,
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Member notify feature cleaned up');
    },
  };
}
