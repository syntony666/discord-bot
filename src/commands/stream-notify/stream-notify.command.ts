import { Bot, InteractionDataOption } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createStreamNotifyModule, StreamNotifyModule } from '@features/stream-notify/stream-notify.module';

import { handleStreamNotifyEnable } from './subcommands/enable';
import { handleStreamNotifyDisable } from './subcommands/disable';
import { handleStreamNotifyWatch } from './subcommands/watch';
import { handleStreamNotifyUnwatch } from './subcommands/unwatch';
import { handleStreamNotifyList } from './subcommands/list';
import { StreamNotifyCommandContext } from './stream-notify.types';

export function setupStreamNotifyCommand(module: StreamNotifyModule) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const sub = interaction.data?.options?.[0] as InteractionDataOption;
    const subName = sub?.name;
    const guildId = interaction.guildId?.toString();

    if (!guildId) return;

    const ctx: StreamNotifyCommandContext = {
      bot,
      interaction,
      guildId,
      module,
      subCommand: sub,
    };

    if (subName === 'enable') {
      const channel = sub.options?.find((o: any) => o.name === 'channel')?.value as string;
      const message = sub.options?.find((o: any) => o.name === 'message')?.value as string;
      
      await handleStreamNotifyEnable(ctx, { channel, message });
    } else if (subName === 'disable') {
      await handleStreamNotifyDisable(ctx);
    } else if (subName === 'watch') {
      const platform = sub.options?.find((o: any) => o.name === 'platform')?.value as 'twitch' | 'youtube';
      const id = sub.options?.find((o: any) => o.name === 'id')?.value as string;
      const name = sub.options?.find((o: any) => o.name === 'name')?.value as string;
      
      await handleStreamNotifyWatch(ctx, { platform, id, name });
    } else if (subName === 'unwatch') {
      const platform = sub.options?.find((o: any) => o.name === 'platform')?.value as 'twitch' | 'youtube';
      const id = sub.options?.find((o: any) => o.name === 'id')?.value as string;
      
      await handleStreamNotifyUnwatch(ctx, { platform, id });
    } else if (subName === 'list') {
      await handleStreamNotifyList(ctx);
    }
  };
}
