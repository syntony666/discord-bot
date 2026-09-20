import type { CommandOption } from '@core/discord/discord.types';
import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { GuildModule } from '@features/guild/guild.module';
import { replySuccess } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { channelMention } from 'shared/utils/discord.utils';
import { setupMemberNotifications } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleEnable(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  guildModule: GuildModule,
  guildId: string,
  subGroup: CommandOption
) {
  const channelId = subGroup.options?.find((o: any) => o.name === 'channel')?.value as string;

  try {
    await setupMemberNotifications(actions, module, guildModule, guildId, channelId);

    await replySuccess(actions, interaction, {
      title: '成員通知已啟用',
      description: `通知頻道已設定為 ${channelMention(channelId)}\n加入與離開通知已自動開啟。`,
    });

    log.info({ guildId, channelId }, 'Member notify enabled completed');
  } catch (error) {
    log.error({ error, guildId, channelId }, 'Failed to enable member notify');
    await handleError(actions, interaction, error, 'memberNotifyEnable');
  }
}
