import { Bot, InteractionDataOption } from '@discordeno/bot';
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
  return async (interaction: BotInteraction, bot: Bot) => {
    const subcommand = interaction.data?.options?.[0] as InteractionDataOption;
    if (!subcommand) return;

    if (subcommand.name === 'bot') {
      await handleBotStatus(interaction, bot);
    } else if (subcommand.name === 'guild') {
      await handleGuildStatus(interaction, bot);
    } else if (subcommand.name === 'notify') {
      await handleNotifyStatus(interaction, bot, modules);
    }
  };
}
