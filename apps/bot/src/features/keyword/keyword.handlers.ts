import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { KeywordMatchType } from '@discord-bot/shared';
import { lastValueFrom } from 'rxjs';
import type { DiscordActions } from '@core/discord/discord-actions';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@core/logger';
import type { KeywordModule } from './keyword.module';
import { createKeywordService } from './keyword.service';
import { keywordCommand } from './keyword.command';

const log = createLogger('Keyword');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface KeywordDeps {
  actions: DiscordActions;
  modules: { keyword: KeywordModule };
}

export function useKeywordHandlers(deps: KeywordDeps) {
  const { actions } = deps;
  const module = deps.modules.keyword;
  const service = createKeywordService(module);
  const h = useHandlers(keywordCommand);

  const cancelled = {
    embeds: [
      { title: '已取消', description: '操作已取消。', color: Colors.INFO },
    ],
    components: [],
  };

  h.handler('add', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { pattern, response } = ctx.options;
    const matchType = ctx.options.match_type ?? KeywordMatchType.EXACT;
    const editorId = ctx.user.id;

    const existing = await lastValueFrom(
      module.getRuleByPattern$(guildId, pattern)
    );

    if (!existing) {
      await lastValueFrom(
        module.createRule$({ guildId, pattern, matchType, response, editorId })
      );
      await ctx.reply({
        embeds: [
          {
            title: '關鍵字已新增',
            description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ pattern, guildId }, 'Keyword added');
      return;
    }

    const ok = await ctx.confirm({
      title: '⚠️ 確認覆寫關鍵字',
      description: `關鍵字 \`${pattern}\` 已存在。是否要覆寫？`,
      fields: [
        {
          name: '目前設定',
          value: `**回覆**: ${existing.response}\n**比對類型**: ${existing.matchType}`,
        },
        {
          name: '新設定',
          value: `**回覆**: ${response}\n**比對類型**: ${matchType}`,
        },
      ],
      confirmLabel: '確認覆寫',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    await lastValueFrom(
      module.updateRule$({ guildId, pattern, response, matchType, editorId })
    );
    await ctx.editReply({
      embeds: [
        {
          title: '關鍵字已更新',
          description: `${Formatters.userMention(editorId)} 已覆蓋更新關鍵字 \`${pattern}\``,
          fields: [
            {
              name: '新設定',
              value: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
            },
          ],
          color: Colors.SUCCESS,
        },
      ],
      components: [],
    });
    log.info({ pattern, guildId }, 'Keyword overwritten');
  });

  h.handler('edit', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { pattern, response } = ctx.options;
    const matchType = ctx.options.match_type ?? KeywordMatchType.EXACT;

    const existing = await lastValueFrom(
      module.getRuleByPattern$(guildId, pattern)
    );
    if (!existing) return ctx.error('找不到此關鍵字。');

    await lastValueFrom(
      module.updateRule$({
        guildId,
        pattern,
        response,
        matchType,
        editorId: ctx.user.id,
      })
    );
    await ctx.reply({
      embeds: [
        {
          title: '關鍵字已更新',
          description: `\`${matchType}\` **${pattern}** ⭢ ${response}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ pattern, guildId }, 'Keyword updated');
  });

  h.handler('list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');

    const rules = await lastValueFrom(module.getRulesForList$(ctx.guildId));
    await ctx.paginate({
      items: rules,
      pageSize: 10,
      emptyText: '目前沒有任何關鍵字規則。',
      render: (page) => ({
        title: '關鍵字規則列表',
        description: page
          .map(
            (r) =>
              `\`${r.matchType}\` ${Formatters.userMention(r.editorId)}\n**${r.pattern}** ⭢ ${r.response}`
          )
          .join('\n'),
      }),
    });
    log.info({ guildId: ctx.guildId }, 'Keyword list displayed');
  });

  h.handler('delete', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { pattern } = ctx.options;
    const editorId = ctx.user.id;

    const rule = await lastValueFrom(
      module.getRuleByPattern$(guildId, pattern)
    );
    if (!rule) return ctx.error('找不到此關鍵字，可能已被其他人刪除。');

    const ok = await ctx.confirm({
      title: '⚠️ 確認刪除關鍵字',
      description: `即將刪除關鍵字 \`${pattern}\`，此操作無法復原。`,
      fields: [
        {
          name: '關鍵字資訊',
          value: `**回覆**: ${rule.response}\n**比對類型**: ${rule.matchType}`,
        },
      ],
      confirmLabel: '確認刪除',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    await lastValueFrom(module.deleteRule$(guildId, pattern));
    await ctx.editReply({
      embeds: [
        {
          title: '關鍵字已刪除',
          description: `${Formatters.userMention(editorId)} 已刪除關鍵字 \`${pattern}\``,
          fields: [
            {
              name: '已刪除的設定',
              value: `\`${rule.matchType}\` **${rule.pattern}** ⭢ ${rule.response}`,
            },
          ],
          color: Colors.WARNING,
        },
      ],
      components: [],
    });
    log.info({ pattern, guildId }, 'Keyword deleted');
  });

  h.event('messageCreate', async (msg) => {
    if (!msg.guild_id || msg.author.bot) return;

    const match = await lastValueFrom(
      service.findMatch$(msg.guild_id, msg.content)
    );
    if (!match) return;

    try {
      await actions.sendMessage(msg.channel_id, {
        content: match.rule.response,
      });
      log.info(
        { guildId: msg.guild_id, pattern: match.rule.pattern },
        'Keyword matched and replied'
      );
    } catch (error: any) {
      if (error?.code === 50013) {
        log.warn(
          { guildId: msg.guild_id, error: error.message },
          'Missing permissions to send message'
        );
      } else {
        log.error(
          { error, guildId: msg.guild_id },
          'Failed to send keyword response'
        );
      }
    }
  });

  return h.collect();
}
