import { InteractionDataOption } from '@discordeno/bot';
import type { DiscordActions } from '@core/discord/discord-actions';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { testMessageTemplate } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleTest(
  actions: DiscordActions,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  service: MemberNotifyService,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const type = subGroup.options?.find((o: any) => o.name === 'type')?.value as 'join' | 'leave';

  try {
    const testMessage = await testMessageTemplate(actions, module, service, guildId, type, interaction);

    await replyInfo(actions, interaction, {
      title: `${type === 'join' ? '加入' : '離開'}訊息預覽`,
      description: testMessage,
    });
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to test message');
    await handleError(actions, interaction, error, 'memberNotifyStatus');
  }
}
