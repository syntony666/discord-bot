import { Bot } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replyInfo } from 'shared/message/message.helper';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError } from 'shared/error';
import { getMessageUrl, channelMention } from 'shared/utils/discord.utils';
import { getModeText } from '../reaction-role.helpers';
import type { PanelMode } from '../reaction-role.types';

const log = createLogger('ReactionRolePanel');

export async function handlePanelList(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string
) {
  try {
    const panels = await lastValueFrom(module.getPanelsByGuild$(guildId));

    if (panels.length === 0) {
      await replyInfo(bot, interaction, {
        title: 'Panel 列表',
        description:
          '目前沒有任何 Reaction Role Panel。\n使用 `/reaction-role panel create` 建立新的 Panel。',
      });
      return;
    }

    const description = await Promise.all(
      panels.map(async (panel) => {
        const roles = await lastValueFrom(
          module.getReactionRolesByMessage$(guildId, panel.messageId)
        );
        const modeText = getModeText(panel.mode as PanelMode);
        const messageUrl = getMessageUrl(guildId, panel.channelId, panel.messageId);

        return [
          `**${panel.title}**`,
          `ID: \`${panel.messageId}\``,
          `頻道: ${channelMention(panel.channelId)}`,
          `模式: ${modeText}`,
          `身分組數量: ${roles.length} 個`,
          `[跳轉至訊息](${messageUrl})`,
          '',
        ].join('\n');
      })
    );

    await replyInfo(bot, interaction, {
      title: `Panel 列表 (${panels.length} 個)`,
      description: description.join('\n'),
    });
  } catch (error) {
    log.error({ error, guildId }, 'Failed to list panels');
    await handleError(bot, interaction, error, 'reactionRolePanelList');
  }
}
