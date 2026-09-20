import { InteractionDataOption } from '@discordeno/bot';
import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { GuildModule } from '@features/guild/guild.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { BotInteraction } from '@core/rx/bus';

import { handleEnable } from './subcommands/enable';
import { handleStatus } from './subcommands/status';
import { handleDisable } from './subcommands/disable';
import { handleTest } from './subcommands/test';
import { handleMessage } from './subcommands/message';
import { handleToggle } from './subcommands/toggle';

export function setupMemberNotifyCommand(
  module: MemberNotifyModule,
  guildModule: GuildModule,
  service: MemberNotifyService
) {
  return async (interaction: BotInteraction, actions: DiscordActions) => {
    const guildId = interaction.guildId?.toString();
    if (!guildId) return;

    const subGroup = interaction.data?.options?.[0] as InteractionDataOption;
    const subGroupName = subGroup?.name;

    if (subGroupName === 'enable') {
      await handleEnable(actions, interaction, module, guildModule, guildId, subGroup);
    } else if (subGroupName === 'status') {
      await handleStatus(actions, interaction, module, guildId);
    } else if (subGroupName === 'disable') {
      await handleDisable(actions, interaction, module, guildId);
    } else if (subGroupName === 'test') {
      await handleTest(actions, interaction, module, service, guildId, subGroup);
    } else if (subGroupName === 'message') {
      await handleMessage(actions, interaction, module, guildId, subGroup);
    } else if (subGroupName === 'toggle') {
      await handleToggle(actions, interaction, module, guildId, subGroup);
    }
  };
}
