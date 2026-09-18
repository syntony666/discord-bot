import { Bot, InteractionDataOption } from '@discordeno/bot';
import { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import { lastValueFrom } from 'rxjs';
import { replySuccess, replyError } from 'shared/message/message.helper';
import { BotInteraction, BotMessage } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { handleError, DiscordErrorHandler } from 'shared/error';
import { channelMention } from 'shared/utils/discord.utils';
import { buildPanelEmbed } from '../reaction-role.helpers';
import type { PanelMode } from '../reaction-role.types';

const log = createLogger('ReactionRolePanel');

export async function handlePanelCreate(
  bot: Bot,
  interaction: BotInteraction,
  module: ReactionRoleModule,
  guildId: string,
  subCommand: InteractionDataOption
) {
  const channelId = subCommand.options?.find((o) => o.name === 'channel')?.value as string;
  const title = (subCommand.options?.find((o) => o.name === 'title')?.value as string) || undefined;
  const description =
    (subCommand.options?.find((o) => o.name === 'description')?.value as string) || undefined;
  const mode = (subCommand.options?.find((o) => o.name === 'mode')?.value as PanelMode) || 'NORMAL';

  try {
    // Step 1: Send Discord message
    const message = (await bot.helpers.sendMessage(
      BigInt(channelId),
      buildPanelEmbed({
        title,
        description,
        mode,
        roles: [],
      })
    )) as BotMessage;

    // Step 2: Update message with panel ID
    await bot.helpers.editMessage(
      BigInt(channelId),
      message.id,
      buildPanelEmbed({
        title,
        description,
        mode,
        roles: [],
        messageId: message.id.toString(),
      })
    );

    // Step 3: Create database record
    await lastValueFrom(
      module.createPanel$({
        guildId,
        channelId,
        messageId: message.id.toString(),
        title,
        description,
        mode,
      })
    );

    await replySuccess(bot, interaction, {
      title: 'Panel 已建立',
      description: `Reaction Role Panel 已在 ${channelMention(channelId)} 建立。\n\n**Panel ID**: \`${message.id}\`\n\n使用 \`/reaction-role add\` 來添加身分組。`,
    });

    log.info({ guildId, channelId, messageId: message.id.toString() }, 'Panel created');
  } catch (error) {
    const result = DiscordErrorHandler.handle(error, {
      operation: 'reactionRolePanelCreate',
      guildId,
      channelId,
    });

    if (result.handled && result.userMessage) {
      await replyError(bot, interaction, {
        title: '建立 Panel 失敗',
        description: result.userMessage,
      });
    } else {
      await handleError(bot, interaction, error, 'reactionRolePanelCreate');
    }
  }
}
