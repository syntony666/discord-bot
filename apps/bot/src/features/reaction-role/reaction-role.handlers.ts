import { Formatters, useHandlers } from '@discord-bot/discord-client';
import { concatMap } from 'rxjs';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { ReactionRoleApi } from './reaction-role.api';
import { createReactionRoleService } from './reaction-role.service';
import { reactionRoleCommand } from './reaction-role.command';
import { buildPanelEmbed, getModeText } from './lib/panel.helpers';
import { ReactionRoleMode } from '@discord-bot/shared';
import {
  addDiscordReaction,
  deleteDiscordMessage,
  deleteDiscordReaction,
  sanitizeUpdates,
  updatePanelMessage,
} from './lib/operations';
import {
  formatEmojiForDisplay,
  formatEmojiForReaction,
  normalizeEmojiForStorage,
} from './lib/emoji.helper';

const log = createLogger('ReactionRole');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface ReactionRoleDeps {
  discord: DiscordHelpers;
  api: { reactionRole: ReactionRoleApi };
}

const cancelled = {
  embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
};

const panelNotFoundEmbed = (panelId: string, extraLine?: string) => ({
  embeds: [
    {
      title: '選單不存在',
      description: `找不到 ID 為 \`${panelId}\` 的選單。${extraLine ? `\n${extraLine}` : ''}`,
      color: Colors.ERROR,
    },
  ],
});

const failEmbed = (action: string, hint = '請稍後再試。') => ({
  embeds: [
    {
      title: `${action}失敗`,
      description: `${action}時發生錯誤，${hint}`,
      color: Colors.ERROR,
    },
  ],
});

export function useReactionRoleHandlers(deps: ReactionRoleDeps) {
  const { discord } = deps;
  const api = deps.api.reactionRole;
  const service = createReactionRoleService(api);
  const h = useHandlers(reactionRoleCommand);

  h.handler('panel.create', async (ctx) => {
    const guildId = ctx.guildId;
    const channelId = ctx.options.channel.id;
    const title = ctx.options.title;
    const description = ctx.options.description;
    const mode = ctx.options.mode || 'NORMAL';

    try {
      const message = await discord.sendMessage(
        channelId,
        buildPanelEmbed({ title, description, mode, roles: [] })
      );

      await discord.editMessage(
        channelId,
        message.id,
        buildPanelEmbed({ title, description, mode, roles: [], messageId: message.id })
      );

      await api.createPanel({
        guildId,
        channelId,
        messageId: message.id,
        title,
        description,
        mode,
      });

      await ctx.reply({
        embeds: [
          {
            title: '選單已建立',
            description: `身分組選單已在 ${Formatters.channelMention(channelId)} 建立。\n\n**選單 ID**: \`${message.id}\`\n\n使用 ${discord.commandMention('reaction-role add')} 來新增身分組。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, channelId, messageId: message.id }, 'Panel created');
    } catch (error) {
      log.error({ error, guildId, channelId }, 'Failed to create panel');
      await ctx.reply(failEmbed('建立選單'));
    }
  });

  h.handler('panel.list', async (ctx) => {
    const guildId = ctx.guildId;

    const panels = await api.getPanelsWithRoles(guildId);

    if (panels.length === 0) {
      return ctx.reply({
        embeds: [
          {
            title: '選單列表',
            description: `目前沒有任何身分組選單。\n使用 ${discord.commandMention('reaction-role panel create')} 建立新的選單。`,
            color: Colors.INFO,
          },
        ],
      });
    }

    const description = panels.map((panel) => {
      const messageUrl = Formatters.messageLink(panel.channelId, panel.messageId, guildId);

      return [
        `**${panel.title}**`,
        `ID: \`${panel.messageId}\``,
        `頻道：${Formatters.channelMention(panel.channelId)}`,
        `模式：${getModeText(panel.mode)}`,
        `身分組數量：${panel.reactionRoles.length} 個`,
        `[跳轉至訊息](${messageUrl})`,
        '',
      ].join('\n');
    });

    await ctx.reply({
      embeds: [
        {
          title: `選單列表 (${panels.length} 個)`,
          description: description.join('\n'),
          color: Colors.INFO,
        },
      ],
    });
  });

  h.handler('panel.delete', async (ctx) => {
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;

    const panel = await api.getPanel(guildId, panelId);
    if (!panel) return ctx.reply(panelNotFoundEmbed(panelId));

    const roles = await api.getReactionRolesByMessage(guildId, panelId);
    const messageUrl = Formatters.messageLink(panel.channelId, panelId, guildId);

    const ok = await ctx.confirm({
      title: '⚠️ 確認刪除選單',
      description: `即將刪除選單及其所有反應身分組，此操作無法復原。`,
      fields: [
        {
          name: '選單資訊',
          value: [
            `**標題**: ${panel.title}`,
            `**ID**: \`${panelId}\``,
            `**頻道**: ${Formatters.channelMention(panel.channelId)}`,
            `**模式**: ${getModeText(panel.mode)}`,
            `**身分組數量**: ${roles.length} 個`,
            `[跳轉至訊息](${messageUrl})`,
          ].join('\n'),
        },
      ],
      confirmLabel: '確認刪除',
      cancelLabel: '取消',
      danger: true,
    });
    if (!ok) return ctx.editReply(cancelled);

    try {
      await deleteDiscordMessage(discord, panel.channelId, panelId, { guildId, panelId });
      await api.deletePanel(guildId, panelId);

      await ctx.editReply({
        embeds: [
          {
            title: '選單已刪除',
            description: `選單 \`${panelId}\` 及其 ${roles.length} 個反應身分組已全部刪除。`,
            color: Colors.WARNING,
          },
        ],
      });
      log.info({ guildId, panelId, rolesCount: roles.length }, 'Panel deleted successfully');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to delete panel');
      await ctx.editReply(failEmbed('刪除選單'));
    }
  });

  h.handler('panel.edit', async (ctx) => {
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const title = ctx.options.title;
    const description = ctx.options.description;
    const mode = ctx.options.mode;

    const panel = await api.getPanel(guildId, panelId);
    if (!panel) return ctx.reply(panelNotFoundEmbed(panelId));

    const updates: { title?: string; description?: string; mode?: ReactionRoleMode } = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (mode !== undefined) updates.mode = mode;

    const messageUrl = Formatters.messageLink(panel.channelId, panelId, guildId);
    const currentFields: string[] = [];
    const newFields: string[] = [];

    if (title !== undefined) {
      currentFields.push(`**標題**: ${panel.title}`);
      newFields.push(`**標題**: ${title}`);
    }
    if (description !== undefined) {
      currentFields.push(`**說明**: ${panel.description || '—'}`);
      newFields.push(`**說明**: ${description || '—'}`);
    }
    if (mode !== undefined) {
      currentFields.push(`**模式**: ${getModeText(panel.mode)}`);
      newFields.push(`**模式**: ${getModeText(mode)}`);
    }

    const ok = await ctx.confirm({
      title: '確認更新選單',
      description: `即將更新選單設定。\n[跳轉至訊息](${messageUrl})`,
      fields: [
        { name: '目前設定', value: currentFields.join('\n'), inline: true },
        { name: '新的設定', value: newFields.join('\n'), inline: true },
      ],
      confirmLabel: '確認更新',
      cancelLabel: '取消',
    });
    if (!ok) return ctx.editReply(cancelled);

    try {
      const roles = await api.getReactionRolesByMessage(guildId, panelId);
      await updatePanelMessage(discord, panel, roles, updates);
      await api.updatePanel(guildId, panelId, sanitizeUpdates(updates));

      await ctx.editReply({
        embeds: [
          {
            title: '選單已更新',
            description: `選單 \`${panelId}\` 已成功更新。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, panelId, updates }, 'Panel edited successfully');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to update panel');
      await ctx.editReply(failEmbed('更新選單'));
    }
  });

  h.handler('add', async (ctx) => {
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const roleId = ctx.options.role.id;
    const description = ctx.options.description;
    const emoji = normalizeEmojiForStorage(ctx.options.emoji);

    const panel = await api.getPanel(guildId, panelId);
    if (!panel)
      return ctx.reply(
        panelNotFoundEmbed(
          panelId,
          `請先使用 ${discord.commandMention('reaction-role panel create')} 建立選單。`
        )
      );

    try {
      const reactionEmoji = formatEmojiForReaction(emoji);
      await addDiscordReaction(discord, panel.channelId, panelId, reactionEmoji, {
        guildId,
        panelId,
      });

      const currentRoles = await api.getReactionRolesByMessage(guildId, panelId);
      const rolesWithNew = [
        ...currentRoles,
        { emoji, roleId, description: description || null, guildId, messageId: panelId },
      ];

      await discord.editMessage(
        panel.channelId,
        panelId,
        buildPanelEmbed({
          title: panel.title,
          description: panel.description || undefined,
          mode: panel.mode,
          roles: rolesWithNew,
          messageId: panelId,
        })
      );

      await api.createReactionRole({
        guildId,
        messageId: panelId,
        emoji: normalizeEmojiForStorage(emoji),
        roleId,
        description,
      });

      const displayEmoji = formatEmojiForDisplay(emoji);
      await ctx.reply({
        embeds: [
          {
            title: '反應身分組已新增',
            description: `${displayEmoji} → ${Formatters.roleMention(roleId)} 已新增到選單。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, messageId: panelId, emoji, roleId }, 'Reaction role added');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to add reaction role');
      await ctx.reply(failEmbed('新增反應身分組', '請確認 emoji 格式正確。'));
    }
  });

  h.handler('remove', async (ctx) => {
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const emoji = normalizeEmojiForStorage(ctx.options.emoji);
    const emojiInput = ctx.options.emoji;

    const reactionRole = await api.getReactionRole(guildId, panelId, emoji);
    if (!reactionRole) {
      return ctx.reply({
        embeds: [
          {
            title: '反應身分組不存在',
            description: `在選單 \`${panelId}\` 中找不到 ${emojiInput} 的綁定。\n\n**提示**: 請使用 ${discord.commandMention('reaction-role role-list')} 查看正確的 emoji 格式。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const panel = await api.getPanel(guildId, panelId);
    if (!panel) return ctx.reply(panelNotFoundEmbed(panelId));

    const displayEmoji = formatEmojiForDisplay(emoji);

    const ok = await ctx.confirm({
      title: '⚠️ 確認移除反應身分組',
      description: `即將從選單中移除此反應身分組。`,
      fields: [
        {
          name: '反應身分組資訊',
          value: [
            `**選單**: ${panel.title} (\`${panelId}\`)`,
            `**Emoji**: ${displayEmoji}`,
            `**身分組**: ${Formatters.roleMention(reactionRole.roleId)}`,
            reactionRole.description ? `**說明**: ${reactionRole.description}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      confirmLabel: '確認移除',
      cancelLabel: '取消',
    });
    if (!ok) return ctx.editReply(cancelled);

    try {
      const reactionEmoji = formatEmojiForReaction(emoji);
      await deleteDiscordReaction(discord, panel.channelId, panelId, reactionEmoji, {
        guildId,
        panelId,
      });

      const currentRoles = await api.getReactionRolesByMessage(guildId, panelId);
      await updatePanelMessage(
        discord,
        panel,
        currentRoles.filter((r) => r.emoji !== emoji)
      );

      await api.deleteReactionRole(guildId, panelId, emoji);

      await ctx.editReply({
        embeds: [
          {
            title: '反應身分組已移除',
            description: `${displayEmoji} 的綁定已從選單中移除。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, panelId, emoji }, 'Reaction role removed');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to remove reaction role');
      await ctx.editReply(failEmbed('移除反應身分組'));
    }
  });

  h.handler('role-list', async (ctx) => {
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;

    const panel = await api.getPanel(guildId, panelId);
    if (!panel) return ctx.reply(panelNotFoundEmbed(panelId));

    const roles = await api.getReactionRolesByMessage(guildId, panelId);

    if (roles.length === 0) {
      return ctx.reply({
        embeds: [
          {
            title: `${panel.title} - 反應身分組`,
            description: `此選單尚未新增任何反應身分組。\n使用 ${discord.commandMention('reaction-role add')} 來新增。`,
            color: Colors.INFO,
          },
        ],
      });
    }

    const description = roles
      .map((role, index) => {
        const displayEmoji = formatEmojiForDisplay(role.emoji);
        return [
          `**${index + 1}.** ${displayEmoji} → ${Formatters.roleMention(role.roleId)}`,
          role.description ? `   └ ${role.description}` : '',
          `   \`emoji: ${role.emoji}\``,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    await ctx.reply({
      embeds: [
        {
          title: `${panel.title} - 反應身分組 (${roles.length} 個)`,
          description: description + '\n\n**提示**: 移除時請複製上方的 `emoji:` 值使用。',
          color: Colors.INFO,
        },
      ],
    });
  });

  // Tracks bot-initiated reaction removals so the remove handler skips the
  // self-triggered event once (consumed on use).
  const pendingRemovals = new Set<string>();
  const removalKey = (userId: string, messageId: string, emoji: string) =>
    `${userId}:${messageId}:${emoji.replace(/^a:/, '')}`;
  const markRemoval = (key: string) => {
    pendingRemovals.add(key);
    setTimeout(() => pendingRemovals.delete(key), 30_000).unref();
  };

  h.stream('messageReactionAdd', (data$) =>
    data$.pipe(
      concatMap(async (reaction) => {
        try {
          if (!reaction.guild_id) return;

          const guildId = reaction.guild_id;
          const messageId = reaction.message_id;
          const emoji = service.normalizeEmoji(reaction.emoji);

          const match = await service.findMatch(guildId, messageId, emoji);
          if (!match) return;

          // UNIQUE mode: remove other roles and reactions FIRST
          if (match.mode === 'UNIQUE') {
            const allRoles = await api.getReactionRolesByMessage(guildId, messageId);

            await Promise.all(
              allRoles
                .filter((role) => role.roleId !== match.roleId)
                .flatMap((role) => {
                  const key = removalKey(reaction.user_id, reaction.message_id, role.emoji);
                  markRemoval(key);
                  return [
                    discord.removeRole(guildId, reaction.user_id, role.roleId).catch((err) => {
                      log.debug(
                        { error: err, roleId: role.roleId },
                        'Failed to remove role (user may not have it)'
                      );
                    }),
                    discord
                      .removeReaction(
                        reaction.channel_id,
                        reaction.message_id,
                        role.emoji,
                        reaction.user_id
                      )
                      .catch((err) => {
                        pendingRemovals.delete(key);
                        log.debug(
                          { error: err, emoji: role.emoji },
                          'Failed to remove reaction (may not exist)'
                        );
                      }),
                  ];
                })
            );

            log.debug(
              { userId: reaction.user_id },
              'Removed other roles and reactions (UNIQUE mode)'
            );
          }

          await discord.addRole(guildId, reaction.user_id, match.roleId);

          log.info(
            { guildId, userId: reaction.user_id, roleId: match.roleId, mode: match.mode },
            'Granted role via reaction'
          );

          // VERIFY mode: remove reaction after granting role
          if (match.mode === 'VERIFY') {
            const key = removalKey(reaction.user_id, messageId, emoji);
            markRemoval(key);
            await discord
              .removeReaction(reaction.channel_id, reaction.message_id, emoji, reaction.user_id)
              .catch((err) => {
                pendingRemovals.delete(key);
                log.debug({ error: err, emoji }, 'Failed to remove reaction (VERIFY mode)');
              });
            log.debug({ userId: reaction.user_id }, 'Removed reaction (VERIFY mode)');
          }
        } catch (error) {
          log.error({ error, messageId: reaction.message_id }, 'reactionRoleAdd failed');
        }
      })
    )
  );

  h.stream('messageReactionRemove', (data$) =>
    data$.pipe(
      concatMap(async (reaction) => {
        try {
          if (!reaction.guild_id) return;

          const guildId = reaction.guild_id;
          const messageId = reaction.message_id;
          const emoji = service.normalizeEmoji(reaction.emoji);

          if (pendingRemovals.delete(removalKey(reaction.user_id, messageId, emoji))) {
            log.debug({ userId: reaction.user_id, emoji }, 'Skipped self-triggered removal');
            return;
          }

          const match = await service.findMatch(guildId, messageId, emoji);
          if (!match) return;

          // VERIFY mode does not remove role when reaction is removed
          if (match.mode === 'VERIFY') {
            log.debug({ userId: reaction.user_id }, 'Skipped role removal (VERIFY mode)');
            return;
          }

          await discord.removeRole(guildId, reaction.user_id, match.roleId);

          log.info(
            { guildId, userId: reaction.user_id, roleId: match.roleId, mode: match.mode },
            'Removed role via reaction'
          );
        } catch (error) {
          log.error({ error, messageId: reaction.message_id }, 'reactionRoleRemove failed');
        }
      })
    )
  );

  return h.collect();
}
