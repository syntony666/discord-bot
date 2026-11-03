import { useHandlers } from '@discord-bot/discord-client';
import type { APIMessage } from 'discord-api-types/v10';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import type { CommandContext } from '@discord-bot/discord-client';
import { createLogger } from '@discord-bot/shared';
import { clearCommand } from './clear.command';
import { partitionClearable, withinMinutes } from './clear.utils';

const log = createLogger('Clear');

const TIME_FETCH_LIMIT = 1000;

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface ClearDeps {
  discord: DiscordHelpers;
}

export function useClearHandlers(deps: ClearDeps) {
  const { discord } = deps;
  const h = useHandlers(clearCommand);

  const purge = async (
    ctx: CommandContext,
    candidates: APIMessage[],
    scope: { range: string; where: string }
  ): Promise<void> => {
    const channelId = ctx.interaction.channel_id;
    const { clearable, pinned } = partitionClearable(candidates);
    if (clearable.length === 0) {
      await ctx.info(
        '沒有可刪除的訊息',
        pinned > 0 ? `${scope.where}的訊息都已釘選，不會被批次刪除。` : `${scope.where}沒有訊息。`
      );
      return;
    }
    if (
      !(await ctx.confirmed({
        title: '確認批次刪除',
        description: `將刪除${scope.range}**${clearable.length}** 則訊息${pinned > 0 ? `（${pinned} 則釘選訊息會保留）` : ''}。`,
        confirmLabel: '刪除',
        danger: true,
      }))
    )
      return;

    const { deleted, skipped } = await discord.bulkDeleteMessages(
      channelId,
      clearable.map((m) => m.id),
      '/clear'
    );
    const notes = [
      skipped.length > 0 && `略過 ${skipped.length} 則超過 14 天的訊息`,
      pinned > 0 && `保留 ${pinned} 則釘選訊息`,
    ]
      .filter(Boolean)
      .join('、');
    await ctx.announceSuccess(
      '批次刪除完成',
      `已刪除 **${deleted.length}** 則訊息。${notes ? `（${notes}）` : ''}`
    );
    log.info(
      { guildId: ctx.guildId, channelId, deleted: deleted.length, skipped: skipped.length },
      'Messages bulk deleted'
    );
  };

  h.handler('count', async (ctx) => {
    const messages = await discord.getChannelMessages(ctx.interaction.channel_id, {
      limit: ctx.options.count,
    });
    await purge(ctx, messages, { range: '最近的 ', where: '頻道內' });
  });

  h.handler('time', async (ctx) => {
    const minutes = ctx.options.minutes;
    // Fetching up to 1000 messages can exceed the 3s interaction ack window.
    await ctx.defer(true);
    const messages = (
      await discord.getChannelMessages(ctx.interaction.channel_id, { limit: TIME_FETCH_LIMIT })
    ).filter((m) => withinMinutes(m, minutes, Date.now()));
    await purge(ctx, messages, {
      range: `最近 **${minutes}** 分鐘內的 `,
      where: `最近 ${minutes} 分鐘內`,
    });
  });

  return h.collect();
}
