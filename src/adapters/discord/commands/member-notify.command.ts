import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { lastValueFrom } from 'rxjs';
import {
  replySuccess,
  replyError,
  replyAutoError,
  replyInfo,
} from '@adapters/discord/shared/message/message.helper';
import { BotGuild, BotInteraction } from '@core/rx/bus';
import { commandRegistry } from './command.registry';
import { createLogger } from '@core/logger';
import { Colors } from '@core/config/colors.config';
import { MemberNotifyConfig } from '@prisma-client/client';

const log = createLogger('MemberNotifyCommand');

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
      await replyError(bot, interaction, {
        description: '此指令只能在伺服器中使用。',
      });
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
      await handleDisable(bot, interaction, module, guildId);
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
      description: `通知頻道已設定為 <#${channelId}>\n功能已自動開啟。`,
    });
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to setup member notify');
    await replyAutoError(bot, interaction, error, {
      generic: '設定成員通知時發生錯誤，請稍後再試。',
    });
  }
}

async function handleDisable(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildId: string
) {
  try {
    await lastValueFrom(module.toggleEnabled$(guildId, false));

    await replySuccess(bot, interaction, {
      title: '成員通知已關閉',
      description: '所有成員進出通知已停用。',
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to disable member notify');
    await replyAutoError(bot, interaction, error, {
      generic: '關閉成員通知時發生錯誤，請稍後再試。',
    });
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
      `**通知頻道**: ${config.channelId ? `<#${config.channelId}>` : '未設定'}`,
      '',
      `**加入通知**: ${joinEmoji} ${config.joinEnabled ? '已啟用' : '已停用'}`,
      `訊息模板: \`${config.joinMessage}\``,
      '',
      `**離開通知**: ${leaveEmoji} ${config.leaveEnabled ? '已啟用' : '已停用'}`,
      `訊息模板: \`${config.leaveMessage}\``,
      '',
      '**可用變數**: `{user}`, `{username}`, `{server}`, `{memberCount}`',
    ].join('\n');

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            title: '成員通知狀態',
            description,
            color: Colors.INFO,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get status');
    await replyError(bot, interaction, {
      description: '查詢設定時發生錯誤。',
    });
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
      user: `<@${interaction.user?.id}>`,
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
    await replyError(bot, interaction, {
      description: '測試訊息時發生錯誤。',
    });
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
    await replyAutoError(bot, interaction, error, {
      generic: '更新訊息模板時發生錯誤，請稍後再試。',
    });
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
    await replyAutoError(bot, interaction, error, {
      generic: '更新設定時發生錯誤，請稍後再試。',
    });
  }
}
