import { Bot, InteractionDataOption } from '@discordeno/bot';
import { MemberNotifyModule } from '@features/member-notify/member-notify.module';
import { MemberNotifyService } from '@features/member-notify/member-notify.service';
import { replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { testMessageTemplate } from '../internal/operations';

const log = createLogger('MemberNotifyCommand');

export async function handleTest(
  bot: Bot,
  interaction: BotInteraction,
  module: MemberNotifyModule,
  service: MemberNotifyService,
  guildId: string,
  subGroup: InteractionDataOption
) {
  const type = subGroup.options?.find((o: any) => o.name === 'type')?.value as 'join' | 'leave';

  try {
    const testMessage = await testMessageTemplate(bot, module, service, guildId, type, interaction);

    await replyInfo(bot, interaction, {
      title: `${type === 'join' ? '加入' : '離開'}訊息預覽`,
      description: testMessage,
    });
  } catch (error) {
    log.error({ error, guildId, type }, 'Failed to test message');
    await handleError(bot, interaction, error, 'memberNotifyStatus');
  }
}
