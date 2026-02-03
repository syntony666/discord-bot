import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { GuildModule } from '@features/guild/guild.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { BotInteraction } from '@core/rx/bus';

// Import subcommand handlers
import { handleSetup } from './subcommands/setup';
import { handleStatus } from './subcommands/status';
import { handleDisable } from './subcommands/disable';
import { handleTest } from './subcommands/test';
import { handleMessage } from './subcommands/message';
import { handleToggle } from './subcommands/toggle';

/**
 * Setup member-notify command handler.
 * Supports subcommands: setup, disable, status, test, message, toggle.
 */
export function setupMemberNotifyCommand(
  module: MemberNotifyModule,
  guildModule: GuildModule,
  service: MemberNotifyService
) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) return;

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

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
}
