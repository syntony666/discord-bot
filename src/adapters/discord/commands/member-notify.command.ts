import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyInfo,
  replyWarning,
} from '@adapters/discord/shared/message/message.helper';
import { BotGuild, BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';
import { MemberNotifyConfig } from '@prisma-client/client';
import { handleError } from '@adapters/discord/shared/error';
import { channelMention, userMention } from '@adapters/discord/shared/utils/discord.utils';
import { createConfirmation } from '@adapters/discord/shared/confirmation/confirmation.helper';
import { ButtonStyles, CustomIdPrefixes, Timeouts } from '@core/config/constants';

const log = createLogger('MemberNotifyCommand');

interface MemberNotifyDisableData {
  guildId: string;
  config: MemberNotifyConfig;
}

/**
 * Slash command handler for /member-notify.
 * Supports subcommands: setup, disable, status, test, message, toggle.
 */
export function createMemberNotifyCommandHandler(
  bot: Bot,
  module: MemberNotifyModule,
  service: MemberNotifyService
) {
  const handler = async (interaction: BotInteraction) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) {
      await handleError(bot, interaction, new Error('Guild ID missing'), 'memberNotifySet');
      return;
    }

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    // Commands that don't require existing config
    if (subGroupName === 'setup') {
      await handleSetup(bot, interaction, module, guildId, subGroup);
      return;
    }

    if (subGroupName === 'status') {
      await handleStatus(bot, interaction, module, guildId);
      return;
    }

    // For all other commands, check if config exists
    const config = await lastValueFrom(module.getConfig$(guildId));
    if (!config) {
      await replyInfo(bot, interaction, {
        title: '尚未設定',
        description: '請先使用 `/member-notify setup` 設定通知頻道。',
      });
      return;
    }

    // Route to handlers with guaranteed config
    if (subGroupName === 'disable') {
      await handleDisable(bot, interaction, module, guildId, config);
    } else if (subGroupName === 'test') {
      await handleTest(bot, interaction, service, guildId, config, subGroup);
    } else if (subGroupName === 'message') {
      await handleMessage(bot, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'toggle') {
      await handleToggle(bot, interaction, module, guildId, subGroup);
    }
  };

  commandRegistry.registerCommand('member-notify', handler);
  return handler;
}

async function handleSetup(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const channelId = subGroup.options?.find((o: any) => o.name === 'channel')?.value as string;

  try {
    await lastValueFrom(module.createOrUpdateConfig$({ guildId, channelId }));

    await replySuccess(bot, interaction, {
      title: '成員通知已設定',
      description: `通知頻道已設定為 ${channelMention(channelId)}\n功能已自動開啟。`,
    });
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to setup member notify');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}

/**
 * Handle /member-notify disable
 * 
 * With confirmation to prevent accidental disable.
 */
async function handleDisable(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string,
  config: MemberNotifyConfig
) {
  const userId = interaction.user?.id?.toString() || '';

  try {
    const enabledNotifications: string[] = [];
    if (config.joinEnabled) enabledNotifications.push('✅ 加入通知');
    if (config.leaveEnabled) enabledNotifications.push('✅ 離開通知');

    await createConfirmation<MemberNotifyDisableData>(
      bot,
      interaction,
      {
        confirmationType: CustomIdPrefixes.MEMBER_NOTIFY_DISABLE,
        userId,
        guildId,
        data: { guildId, config },
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
              value: channelMention(config.channelId as string),
            },
          ],
        },
        buttons: {
          confirmLabel: '確認關閉',
          confirmStyle: ButtonStyles.PRIMARY,
          cancelLabel: '取消',
          cancelStyle: ButtonStyles.SECONDARY,
        },
      },
      {
        onConfirm: async (bot, interaction, data) => {
          try {
            await lastValueFrom(module.toggleEnabled$(data.guildId, false));

            await replySuccess(bot, interaction, {
              title: '成員通知已關閉',
              description: '所有成員進出通知已停用。\n使用 `/member-notify setup` 可重新啟用。',
              isEdit: true,
            });

            log.info({ guildId: data.guildId }, 'Member notify disabled');
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

async function handleStatus(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  try {
    const config = await lastValueFrom(module.getConfig$(guildId));

    if (!config) {
      await replyInfo(bot, interaction, {
        title: '成員通知狀態',
        description: '尚未設定成員通知功能。\n使用 `/member-notify setup` 開始設定。',
      });
      return;
    }

    const statusEmoji = config.enabled ? '✅' : '❌';
    const joinEmoji = config.joinEnabled ? '✅' : '❌';
    const leaveEmoji = config.leaveEnabled ? '✅' : '❌';

    const description = [
      `**總開關**: ${statusEmoji} ${config.enabled ? '已啟用' : '已停用'}`,
      `**通知頻道**: ${config.channelId ? channelMention(config.channelId) : '未設定'}`,
      '',
      `**加入通知**: ${joinEmoji} ${config.joinEnabled ? '已啟用' : '已停用'}`,
      `訊息模板: \`${config.joinMessage}\``,
      '',
      `**離開通知**: ${leaveEmoji} ${config.leaveEnabled ? '已啟用' : '已停用'}`,
      `訊息模板: \`${config.leaveMessage}\``,
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

async function handleTest(
  bot: Bot,
  interaction: BotInteraction,
  service: MemberNotifyService,
  guildId: string,
  config: MemberNotifyConfig,
  subGroup: InteractionDataOption
) {
  const type = subGroup.options?.find((o: any) => o.name === 'type')?.value as 'join' | 'leave';

  try {
    const guild = (await bot.helpers.getGuild(interaction.guildId!)) as BotGuild;
    const template = type === 'join' ? config.joinMessage : config.leaveMessage;

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
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to update message');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}

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
    if (type === 'join') {
      await lastValueFrom(module.toggleJoinEnabled$(guildId, enabled));
    } else {
      await lastValueFrom(module.toggleLeaveEnabled$(guildId, enabled));
    }

    await replySuccess(bot, interaction, {
      title: '設定已更新',
      description: `${type === 'join' ? '加入' : '離開'}通知已${enabled ? '啟用' : '停用'}。`,
    });
  } catch (error) {
    log.error({ error, guildId, type, enabled }, 'Failed to toggle');
    await handleError(bot, interaction, error, 'memberNotifySet');
  }
}
