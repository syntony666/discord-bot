import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { KeywordMatchType } from '@discord-bot/shared';
import type { KeywordRule } from '@discord-bot/shared';
import type { CommandContext, DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { KeywordApi } from './keyword.api';
import { createKeywordService } from './keyword.service';
import { responsePreview, truncate } from './keyword.preview';
import { keywordCommand } from './keyword.command';

const log = createLogger('Keyword');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface KeywordDeps {
  discord: DiscordHelpers;
  api: { keyword: KeywordApi };
}

export function useKeywordHandlers(deps: KeywordDeps) {
  const { discord } = deps;
  const api = deps.api.keyword;
  const service = createKeywordService(api);
  const h = useHandlers(keywordCommand);

  const cancelled = {
    embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
    components: [],
  };

  const formatRule = (r: KeywordRule) =>
    `**${truncate(r.pattern, 150)}** ⭢ ${responsePreview(r.response, 150)}\n\`${r.matchType}\` ${Formatters.userMention(r.editorId)}`;

  const paginateRules = (
    ctx: CommandContext,
    rules: KeywordRule[],
    title: string,
    emptyText: string
  ) =>
    ctx.paginate({
      items: rules,
      pageSize: 10,
      emptyText,
      render: (page) => ({
        title,
        description: page.map(formatRule).join('\n\n'),
      }),
    });

  h.handler('add', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { pattern, response } = ctx.options;
    const matchType = ctx.options.match_type ?? KeywordMatchType.EXACT;
    const editorId = ctx.user.id;

    const existing = await api.getRuleByPattern(guildId, pattern);

    if (!existing) {
      await api.createRule({ guildId, pattern, matchType, response, editorId });
      await ctx.reply({
        embeds: [
          {
            title: '關鍵字已新增',
            description: `\`${matchType}\` **${pattern}** ⭢ ${responsePreview(response, 900)}`,
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
          value: `**回覆**: ${responsePreview(existing.response, 900)}\n**比對類型**: ${existing.matchType}`,
        },
        {
          name: '新設定',
          value: `**回覆**: ${responsePreview(response, 900)}\n**比對類型**: ${matchType}`,
        },
      ],
      confirmLabel: '確認覆寫',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    await api.updateRule({ guildId, pattern, response, matchType, editorId });
    await ctx.editReply({
      embeds: [
        {
          title: '關鍵字已更新',
          description: `${Formatters.userMention(editorId)} 已覆蓋更新關鍵字 \`${pattern}\``,
          fields: [
            {
              name: '新設定',
              value: `\`${matchType}\` **${pattern}** ⭢ ${responsePreview(response, 900)}`,
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

    const existing = await api.getRuleByPattern(guildId, pattern);
    if (!existing) return ctx.error('找不到此關鍵字。');

    await api.updateRule({
      guildId,
      pattern,
      response,
      matchType,
      editorId: ctx.user.id,
    });
    await ctx.reply({
      embeds: [
        {
          title: '關鍵字已更新',
          description: `\`${matchType}\` **${pattern}** ⭢ ${responsePreview(response, 900)}`,
          color: Colors.SUCCESS,
        },
      ],
    });
    log.info({ pattern, guildId }, 'Keyword updated');
  });

  h.handler('list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');

    const rules = await api.getRulesForList(ctx.guildId);
    await paginateRules(ctx, rules, '關鍵字規則列表', '目前沒有任何關鍵字規則。');
    log.info({ guildId: ctx.guildId }, 'Keyword list displayed');
  });

  h.handler('view', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const { pattern } = ctx.options;

    const rule = await api.getRuleByPattern(ctx.guildId, pattern);
    if (!rule) return ctx.error('找不到此關鍵字。');

    const candidates = rule.response.split(';;').filter((p) => p.length > 0);
    const meta = [`\`${rule.matchType}\``, Formatters.userMention(rule.editorId)];
    if (candidates.length > 1) meta.push(`候選 ${candidates.length} 個`);

    const body = candidates.length > 1 ? candidates.join('、') : rule.response;
    const shown = body.length > 3900 ? `${body.slice(0, 3900)}… (已截斷)` : body;
    const arrow =
      candidates.length > 1 ? `**${rule.pattern}** ⭢\n${shown}` : `**${rule.pattern}** ⭢ ${shown}`;

    await ctx.reply({
      embeds: [
        {
          title: '關鍵字規則',
          description: `${arrow}\n\n${meta.join(' · ')}`,
          color: Colors.INFO,
        },
      ],
    });
    log.info({ guildId: ctx.guildId, pattern }, 'Keyword rule viewed');
  });

  h.handler('search', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { query } = ctx.options;

    const rules = await api.searchRules(guildId, query);
    await paginateRules(ctx, rules, `關鍵字搜尋：${query}`, `找不到符合「${query}」的關鍵字規則。`);
    log.info({ guildId, query }, 'Keyword search displayed');
  });

  h.handler('delete', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const { pattern } = ctx.options;
    const editorId = ctx.user.id;

    const rule = await api.getRuleByPattern(guildId, pattern);
    if (!rule) return ctx.error('找不到此關鍵字，可能已被其他人刪除。');

    const ok = await ctx.confirm({
      title: '⚠️ 確認刪除關鍵字',
      description: `即將刪除關鍵字 \`${pattern}\`，此操作無法復原。`,
      fields: [
        {
          name: '關鍵字資訊',
          value: `**回覆**: ${responsePreview(rule.response, 900)}\n**比對類型**: ${rule.matchType}`,
        },
      ],
      confirmLabel: '確認刪除',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    await api.deleteRule(guildId, pattern);
    await ctx.editReply({
      embeds: [
        {
          title: '關鍵字已刪除',
          description: `${Formatters.userMention(editorId)} 已刪除關鍵字 \`${pattern}\``,
          fields: [
            {
              name: '已刪除的設定',
              value: `\`${rule.matchType}\` **${truncate(rule.pattern, 150)}** ⭢ ${responsePreview(rule.response, 900)}`,
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

    const match = await service.findMatch(msg.guild_id, msg.content);
    if (!match) return;

    try {
      await discord.sendMessage(msg.channel_id, {
        content: match.rule.response,
      });
      log.info(
        { guildId: msg.guild_id, pattern: match.rule.pattern },
        'Keyword matched and replied'
      );
    } catch (error) {
      if ((error as { code?: number }).code === RESTJSONErrorCodes.MissingPermissions) {
        log.warn(
          { guildId: msg.guild_id, error: (error as Error).message },
          'Missing permissions to send message'
        );
      } else {
        log.error({ error, guildId: msg.guild_id }, 'Failed to send keyword response');
      }
    }
  });

  return h.collect();
}
