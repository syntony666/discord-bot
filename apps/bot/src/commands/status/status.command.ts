import type { CommandOption } from '@core/discord/discord.types';
import { interactionOptions, interactionCustomId, interactionComponents } from '@core/discord/interaction.helpers';
import type { DiscordActions } from '@core/discord/discord-actions';
import { BotInteraction } from '@core/rx/bus';

import { handleBotStatus } from './subcommands/bot';
import { handleGuildStatus } from './subcommands/guild';
import { handleNotifyStatus } from './subcommands/notify';

import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { StreamNotifyModule } from '@features/stream-notify/stream-notify.module';
import { KeywordModule } from '@features/keyword/keyword.module';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';

export interface StatusCommandModules {
  memberNotify: MemberNotifyModule;
  streamNotify: StreamNotifyModule;
  keyword: KeywordModule;
  reactionRole: ReactionRoleModule;
}

export function setupStatusCommand(modules: StatusCommandModules) {
  return async (interaction: BotInteraction, actions: DiscordActions) => {
    const subcommand = interactionOptions(interaction)?.[0] as CommandOption;
    if (!subcommand) return;

    if (subcommand.name === 'bot') {
      await handleBotStatus(interaction, actions);
    } else if (subcommand.name === 'guild') {
      await handleGuildStatus(interaction, actions);
    } else if (subcommand.name === 'notify') {
      await handleNotifyStatus(interaction, actions, modules);
    }
  };
}
