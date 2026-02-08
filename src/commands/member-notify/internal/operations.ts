import { Bot, InteractionDataOption } from '@discordeno/bot';
import { createLogger } from '@core/logger';
import { MemberNotifyMessage, NotificationType } from '@prisma-client/client';
import { channelMention, userMention } from 'shared/utils/discord.utils';
import type { BotGuild, BotInteraction } from '@core/rx/bus';
import { formatMessageTemplate, getDefaultTemplates } from '../member-notify.helpers';
import { lastValueFrom } from 'rxjs';

const log = createLogger('MemberNotifyOperations');

export async function setupMemberNotifications(
  bot: Bot,
  module: any,
  guildModule: any,
  guildId: string,
  channelId: string
): Promise<void> {
  try {
    // Ensure guild exists
    await lastValueFrom(guildModule.ensureGuild$(guildId));

    // Setup both notification channels
    await Promise.all([
      lastValueFrom(
        module.setNotificationChannel$({
          guildId,
          type: NotificationType.MEMBER_JOIN,
          channelId,
        })
      ),
      lastValueFrom(
        module.setNotificationChannel$({
          guildId,
          type: NotificationType.MEMBER_LEAVE,
          channelId,
        })
      ),
    ]);

    log.debug({ guildId, channelId }, 'Member notify setup completed');
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to setup member notify');
    throw error;
  }
}

export async function disableMemberNotifications(
  bot: Bot,
  module: any,
  guildId: string,
  channels: any[]
): Promise<void> {
  try {
    // Disable all notification channels
    await Promise.all(
      channels.map((ch) => lastValueFrom(module.toggleChannelEnabled$(guildId, ch.type, false)))
    );

    log.debug({ guildId }, 'All member notifications disabled');
  } catch (error) {
    log.error({ error, guildId }, 'Failed to disable member notifications');
    throw error;
  }
}

export async function getMemberNotificationStatus(
  bot: Bot,
  module: any,
  guildId: string
): Promise<any> {
  try {
    const [joinChannel, leaveChannel, templates] = await Promise.all([
      lastValueFrom(module.getNotificationChannel$(guildId, NotificationType.MEMBER_JOIN)),
      lastValueFrom(module.getNotificationChannel$(guildId, NotificationType.MEMBER_LEAVE)),
      lastValueFrom(module.getMessageTemplates$(guildId)),
    ]);

    return { joinChannel, leaveChannel, templates };
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get member notification status');
    throw error;
  }
}

export async function testMessageTemplate(
  bot: Bot,
  module: any,
  service: any,
  guildId: string,
  type: 'join' | 'leave',
  interaction: BotInteraction
): Promise<string> {
  try {
    const templates: MemberNotifyMessage = await lastValueFrom(
      module.getMessageTemplates$(guildId)
    );
    const guild = (await bot.helpers.getGuild(interaction.guildId!)) as BotGuild;

    const defaultTemplates = getDefaultTemplates();
    const template =
      type === 'join'
        ? templates?.joinMessage || defaultTemplates.join
        : templates?.leaveMessage || defaultTemplates.leave;

    const testMessage = service.formatMessage(template, {
      user: userMention(interaction.user?.id || ''),
      username: interaction.user?.username || 'TestUser',
      server: guild.name,
      memberCount: guild.approximateMemberCount || 0,
    });

    log.debug({ guildId, type }, 'Message template tested');
    return testMessage;
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to test message template');
    throw error;
  }
}

export async function updateMessageTemplate(
  bot: Bot,
  module: any,
  guildId: string,
  type: 'join' | 'leave',
  template: string
): Promise<void> {
  try {
    await lastValueFrom(module.updateMessage$({ guildId, type, message: template }));
    log.debug({ guildId, type }, 'Message template updated');
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to update message template');
    throw error;
  }
}

export async function toggleNotificationType(
  bot: Bot,
  module: any,
  guildId: string,
  type: 'join' | 'leave',
  enabled: boolean
): Promise<void> {
  try {
    const notifyType =
      type === 'join' ? NotificationType.MEMBER_JOIN : NotificationType.MEMBER_LEAVE;

    await lastValueFrom(module.toggleChannelEnabled$(guildId, notifyType, enabled));
    log.debug({ guildId, type, enabled }, 'Notification toggled');
  } catch (error) {
    log.error({ error, guildId, type, enabled }, 'Failed to toggle notification');
    throw error;
  }
}
