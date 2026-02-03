// src/adapters/discord/commands/member-notify.command.ts

import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { GuildModule } from '@features/guild/guild.module';
import { lastValueFrom } from 'rxjs';
import { replySuccess, replyInfo, replyWarning } from 'shared/message/message.helper';
import { BotGuild, BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';
import { NotificationChannel, NotificationType } from '@prisma-client/client';
import { handleError } from 'shared/error';
import { channelMention, userMention } from 'shared/utils/discord.utils';
import { createConfirmation } from 'shared/confirmation/confirmation.helper';
import { ButtonStyles, CustomIdPrefixes, Timeouts } from '@core/config/constants';

const log = createLogger('MemberNotifyCommand');

interface MemberNotifyDisableData {
  guildId: string;
  channels: NotificationChannel[];
}

/**
 * Slash command handler for /member-notify.
 * Supports subcommands: setup, disable, status, test, message, toggle.
 */
export function createMemberNotifyCommandHandler(
  bot: Bot,
  module: MemberNotifyModule,
  service: MemberNotifyService,
  guildModule: GuildModule
) {
  const handler = async (interaction: BotInteraction) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await handleError(bot, interaction, new Error('Guild ID missing'), 'memberNotifySet');
      return;
    }

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    // Route to handlers
    if (subGroupName === 'setup') {
      await handleSetup(bot, interaction, module, guildModule, guildId, subGroup);
    } else if (subGroupName === 'status') {
      await handleStatus(bot, interaction, module, guildId);
    } else if (subGroupName === 'disable') {
      await handleDisable(bot, interaction, module, guildId);
    } else if (subGroupName === 'test') {
      await handleTest(bot, interaction, module, service, guildId, subGroup);
    } else if (subGroupName === 'message') {
      await handleMessage(bot, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'toggle') {
      await handleToggle(bot, interaction, module, guildId, subGroup);
    }
  };

  commandRegistry.registerCommand('member-notify', handler);
  return handler;
}

/**
 * Handle /member-notify setup
 */
async function handleSetup(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildModule: GuildModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const channelId = subGroup.options?.find((o: any) => o.name === 'channel')?.value as string;

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

    await replySuccess(bot, interaction, {
      title: '成員通知已設定',
      description: `通知頻道已設定為 ${channelMention(channelId)}\n加入與離開通知已自動開啟。`,
    });

    log.info({ guildId, channelId }, 'Member notify setup completed');
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to setup member notify');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}

/**
 * Handle /member-notify disable
 */
async function handleDisable(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  const userId = interaction.user?.id?.toString() || '';

  try {
    // Get all notification channels
    const channels = await lastValueFrom(module.getNotificationChannels$(guildId));

    if (channels.length === 0) {
      await replyInfo(bot, interaction, {
        title: '尚未設定',
        description: '目前沒有任何通知設定。',
      });
      return;
    }

    const enabledNotifications = channels
      .filter((ch) => ch.enabled)
      .map((ch) => `✅ ${ch.type === NotificationType.MEMBER_JOIN ? '加入' : '離開'}通知`);

    await createConfirmation<MemberNotifyDisableData>(
      bot,
      interaction,
      {
        confirmationType: CustomIdPrefixes.MEMBER_NOTIFY_DISABLE,
        userId,
        guildId,
        data: { guildId, channels },
        expiresIn: Timeouts.CONFIRMATION_MS,
        embed: {
          title: '⚠️ 確認關閉成員通知',
          description: '即將關閉所有成員進出通知功能。',
          fields: [
            {
              name: '目前啟用的通知',
              value:
                enabledNotifications.length > 0
                  ? enabledNotifications.join('\n')
                  : '*(所有通知都已關閉)*',
            },
            {
              name: '通知頻道',
              value: channels.map((ch) => channelMention(ch.channelId)).join(', '),
            },
          ],
        },
        buttons: {
          confirmLabel: '確認關閉',
          confirmStyle: ButtonStyles.DANGER,
          cancelLabel: '取消',
          cancelStyle: ButtonStyles.SECONDARY,
        },
      },
      {
        onConfirm: async (bot, interaction, data) => {
          try {
            // Disable all notification channels
            await Promise.all(
              data.channels.map((ch) =>
                lastValueFrom(module.toggleChannelEnabled$(data.guildId, ch.type, false))
              )
            );

            await replySuccess(bot, interaction, {
              title: '成員通知已關閉',
              description: '所有成員進出通知已停用。\n使用 `/member-notify setup` 可重新啟用。',
              isEdit: true,
            });

            log.info({ guildId: data.guildId }, 'All member notifications disabled');
          } catch (error) {
            log.error({ error, guildId: data.guildId }, 'Failed to disable member notify');
            await handleError(bot, interaction, error, 'memberNotifyRemove');
          }
        },
        onCancel: async (bot, interaction, data) => {
          await replyInfo(bot, interaction, {
            title: '已取消',
            description: '已取消關閉成員通知功能。',
            isEdit: true,
          });
        },
      }
    );

    log.info({ guildId }, 'Member notify disable confirmation requested');
  } catch (error) {
    log.error({ error, guildId }, 'Failed to prepare member notify disable confirmation');
    await handleError(bot, interaction, error, 'memberNotifyRemove');
  }
}

/**
 * Handle /member-notify status
 */
async function handleStatus(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  try {
    const [joinChannel, leaveChannel, templates] = await Promise.all([
      lastValueFrom(module.getNotificationChannel$(guildId, NotificationType.MEMBER_JOIN)),
      lastValueFrom(module.getNotificationChannel$(guildId, NotificationType.MEMBER_LEAVE)),
      lastValueFrom(module.getMessageTemplates$(guildId)),
    ]);

    if (!joinChannel && !leaveChannel) {
      await replyInfo(bot, interaction, {
        title: '成員通知狀態',
        description: '尚未設定成員通知功能。\n使用 `/member-notify setup` 開始設定。',
      });
      return;
    }

    const joinEmoji = joinChannel?.enabled ? '✅' : '❌';
    const leaveEmoji = leaveChannel?.enabled ? '✅' : '❌';

    const description = [
      `**加入通知**: ${joinEmoji} ${joinChannel?.enabled ? '已啟用' : '已停用'}`,
      joinChannel ? `通知頻道: ${channelMention(joinChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.joinMessage || '預設訊息'}\``,
      '',
      `**離開通知**: ${leaveEmoji} ${leaveChannel?.enabled ? '已啟用' : '已停用'}`,
      leaveChannel ? `通知頻道: ${channelMention(leaveChannel.channelId)}` : '*(未設定)*',
      `訊息模板: \`${templates?.leaveMessage || '預設訊息'}\``,
      '',
      '**可用變數**: `{user}`, `{username}`, `{server}`, `{memberCount}`',
    ].join('\n');

    await replyInfo(bot, interaction, {
      title: '成員通知狀態',
      description,
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get status');
    await handleError(bot, interaction, error, 'memberNotifyStatus');
  }
}

/**
 * Handle /member-notify test
 */
async function handleTest(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  service: MemberNotifyService,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const type = subGroup.options?.find((o: any) => o.name === 'type')?.value as 'join' | 'leave';

  try {
    const templates = await lastValueFrom(module.getMessageTemplates$(guildId));
    const guild = (await bot.helpers.getGuild(interaction.guildId!)) as BotGuild;

    const template =
      type === 'join'
        ? templates?.joinMessage || '📥 {user} 加入了 {server}！目前共 {memberCount} 位成員'
        : templates?.leaveMessage || '📤 {username} 離開了 {server}。目前剩餘 {memberCount} 位成員';

    const testMessage = service.formatMessage(template, {
      user: userMention(interaction.user?.id || ''),
      username: interaction.user?.username || 'TestUser',
      server: guild.name,
      memberCount: guild.approximateMemberCount || 0,
    });

    await replyInfo(bot, interaction, {
      title: `${type === 'join' ? '加入' : '離開'}訊息預覽`,
      description: testMessage,
    });
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to test message');
    await handleError(bot, interaction, error, 'memberNotifyStatus');
  }
}

/**
 * Handle /member-notify message
 */
async function handleMessage(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const subCommand = subGroup.options?.[0] as InteractionDataOption;
  const type = subCommand?.name as 'join' | 'leave';
  const template = subCommand.options?.find((o: any) => o.name === 'template')?.value as string;

  try {
    await lastValueFrom(module.updateMessage$({ guildId, type, message: template }));

    await replySuccess(bot, interaction, {
      title: '訊息模板已更新',
      description: `${type === 'join' ? '加入' : '離開'}訊息已更新為：\n\`${template}\``,
    });

    log.info({ guildId, type }, 'Message template updated');
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to update message');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}

/**
 * Handle /member-notify toggle
 */
async function handleToggle(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const subCommand = subGroup.options?.[0] as InteractionDataOption;
  const type = subCommand?.name as 'join' | 'leave';
  const enabled = subCommand.options?.find((o: any) => o.name === 'enabled')?.value as boolean;

  try {
    const notifyType =
      type === 'join' ? NotificationType.MEMBER_JOIN : NotificationType.MEMBER_LEAVE;

    await lastValueFrom(module.toggleChannelEnabled$(guildId, notifyType, enabled));

    await replySuccess(bot, interaction, {
      title: '設定已更新',
      description: `${type === 'join' ? '加入' : '離開'}通知已${enabled ? '啟用' : '停用'}。`,
    });

    log.info({ guildId, type, enabled }, 'Notification toggled');
  } catch (error) {
    log.error({ error, guildId, type, enabled }, 'Failed to toggle');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}
