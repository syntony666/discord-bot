import { Formatters, useHandlers } from '@discord-bot/discord-client';
import type { CommandContext } from '@discord-bot/discord-client';
import { concatMap } from 'rxjs';
import type { DiscordActions } from '@discord-bot/discord-client';
import { Colors } from '@core/config/colors.config';
import { createLogger } from '@discord-bot/shared';
import type { ReactionRoleModule } from './reaction-role.module';
import { createReactionRoleService } from './reaction-role.service';
import { reactionRoleCommand } from './reaction-role.command';
import { buildPanelEmbed, getModeText } from './internal/panel.helpers';
import type { PanelMode } from './internal/panel.helpers';
import {
  addDiscordReaction,
  deleteDiscordMessage,
  deleteDiscordReaction,
  sanitizeUpdates,
  updatePanelMessage,
} from './internal/operations';
import {
  formatEmojiForDisplay,
  formatEmojiForReaction,
  normalizeEmojiForStorage,
} from './internal/emoji.helper';

const log = createLogger('ReactionRole');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface ReactionRoleDeps {
  actions: DiscordActions;
  modules: { reactionRole: ReactionRoleModule };
}

const cancelled = {
  embeds: [{ title: '已取消', description: '操作已取消。', color: Colors.INFO }],
  components: [],
};

export function useReactionRoleHandlers(deps: ReactionRoleDeps) {
  const { actions } = deps;
  const module = deps.modules.reactionRole;
  const service = createReactionRoleService(module);
  const h = useHandlers(reactionRoleCommand);

  h.handler('panel.create', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const channelId = ctx.options.channel.id;
    const title = ctx.options.title;
    const description = ctx.options.description;
    const mode = ctx.options.mode || 'NORMAL';

    try {
      const message = await actions.sendMessage(
        channelId,
        buildPanelEmbed({ title, description, mode, roles: [] })
      );

      await actions.editMessage(
        channelId,
        message.id,
        buildPanelEmbed({ title, description, mode, roles: [], messageId: message.id })
      );

      await module.createPanel({
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
            title: 'Panel 已建立',
            description: `Reaction Role Panel 已在 ${Formatters.channelMention(channelId)} 建立。\n\n**Panel ID**: \`${message.id}\`\n\n使用 \`/reaction-role add\` 來添加身分組。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, channelId, messageId: message.id }, 'Panel created');
    } catch (error) {
      log.error({ error, guildId, channelId }, 'Failed to create panel');
      await ctx.reply({
        embeds: [
          {
            title: '建立 Panel 失敗',
            description: '建立 Panel 時發生錯誤，請稍後再試。',
            color: Colors.ERROR,
          },
        ],
      });
    }
  });

  h.handler('panel.list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;

    const panels = await module.getPanelsByGuild(guildId);

    if (panels.length === 0) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 列表',
            description:
              '目前沒有任何 Reaction Role Panel。\n使用 `/reaction-role panel create` 建立新的 Panel。',
            color: Colors.INFO,
          },
        ],
      });
    }

    const description = await Promise.all(
      panels.map(async (panel) => {
        const roles = await module.getReactionRolesByMessage(guildId, panel.messageId);
        const messageUrl = Formatters.messageLink(panel.channelId, panel.messageId, guildId);

        return [
          `**${panel.title}**`,
          `ID: \`${panel.messageId}\``,
          `頻道: ${Formatters.channelMention(panel.channelId)}`,
          `模式: ${getModeText(panel.mode as PanelMode)}`,
          `身分組數量: ${roles.length} 個`,
          `[跳轉至訊息](${messageUrl})`,
          '',
        ].join('\n');
      })
    );

    await ctx.reply({
      embeds: [
        {
          title: `Panel 列表 (${panels.length} 個)`,
          description: description.join('\n'),
          color: Colors.INFO,
        },
      ],
    });
  });

  h.handler('panel.delete', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;

    const panel = await module.getPanel(guildId, panelId);
    if (!panel) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 不存在',
            description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const roles = await module.getReactionRolesByMessage(guildId, panelId);
    const messageUrl = Formatters.messageLink(panel.channelId, panelId, guildId);

    const ok = await ctx.confirm({
      title: '⚠️ 確認刪除 Panel',
      description: `即將刪除 Panel 及其所有 Reaction Roles，此操作無法復原。`,
      fields: [
        {
          name: 'Panel 資訊',
          value: [
            `**標題**: ${panel.title}`,
            `**ID**: \`${panelId}\``,
            `**頻道**: ${Formatters.channelMention(panel.channelId)}`,
            `**模式**: ${getModeText(panel.mode as PanelMode)}`,
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
      await deleteDiscordMessage(actions, panel.channelId, panelId, { guildId, panelId });
      await module.deletePanel(guildId, panelId);

      await ctx.editReply({
        embeds: [
          {
            title: 'Panel 已刪除',
            description: `Panel \`${panelId}\` 及其 ${roles.length} 個 Reaction Roles 已全部刪除。`,
            color: Colors.WARNING,
          },
        ],
        components: [],
      });
      log.info({ guildId, panelId, rolesCount: roles.length }, 'Panel deleted successfully');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to delete panel');
      await ctx.editReply({
        embeds: [
          {
            title: '刪除 Panel 失敗',
            description: '刪除 Panel 時發生錯誤，請稍後再試。',
            color: Colors.ERROR,
          },
        ],
        components: [],
      });
    }
  });

  h.handler('panel.edit', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const title = ctx.options.title;
    const description = ctx.options.description;
    const mode = ctx.options.mode;

    const panel = await module.getPanel(guildId, panelId);
    if (!panel) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 不存在',
            description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const updates: { title?: string; description?: string; mode?: PanelMode } = {};
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
      currentFields.push(`**說明**: ${panel.description || '*(無)*'}`);
      newFields.push(`**說明**: ${description || '*(無)*'}`);
    }
    if (mode !== undefined) {
      currentFields.push(`**模式**: ${getModeText(panel.mode as PanelMode)}`);
      newFields.push(`**模式**: ${getModeText(mode)}`);
    }

    const ok = await ctx.confirm({
      title: '📝 確認更新 Panel',
      description: `即將更新 Panel 設定。\n[跳轉至訊息](${messageUrl})`,
      fields: [
        { name: '目前設定', value: currentFields.join('\n'), inline: true },
        { name: '新的設定', value: newFields.join('\n'), inline: true },
      ],
      confirmLabel: '確認更新',
      cancelLabel: '取消',
    });
    if (!ok) return ctx.editReply(cancelled);

    try {
      const roles = await module.getReactionRolesByMessage(guildId, panelId);
      await updatePanelMessage(actions, panel, roles, updates);
      await module.updatePanel(guildId, panelId, sanitizeUpdates(updates));

      await ctx.editReply({
        embeds: [
          {
            title: 'Panel 已更新',
            description: `Panel \`${panelId}\` 已成功更新。`,
            color: Colors.SUCCESS,
          },
        ],
        components: [],
      });
      log.info({ guildId, panelId, updates }, 'Panel edited successfully');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to update panel');
      await ctx.editReply({
        embeds: [
          {
            title: '更新 Panel 失敗',
            description: '更新 Panel 時發生錯誤，請稍後再試。',
            color: Colors.ERROR,
          },
        ],
        components: [],
      });
    }
  });

  h.handler('add', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const roleId = ctx.options.role.id;
    const description = ctx.options.description;
    const emoji = normalizeEmojiForStorage(ctx.options.emoji);

    const panel = await module.getPanel(guildId, panelId);
    if (!panel) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 不存在',
            description: `找不到 ID 為 \`${panelId}\` 的 Panel。\n請先使用 \`/reaction-role panel create\` 建立 Panel。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    try {
      const reactionEmoji = formatEmojiForReaction(emoji);
      await addDiscordReaction(actions, panel.channelId, panelId, reactionEmoji, {
        guildId,
        panelId,
      });

      const currentRoles = await module.getReactionRolesByMessage(guildId, panelId);
      const rolesWithNew = [
        ...currentRoles,
        { emoji, roleId, description: description || null, guildId, messageId: panelId },
      ];

      await actions.editMessage(
        panel.channelId,
        panelId,
        buildPanelEmbed({
          title: panel.title,
          description: panel.description || undefined,
          mode: panel.mode as PanelMode,
          roles: rolesWithNew,
          messageId: panelId,
        })
      );

      await module.createReactionRole({
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
            title: 'Reaction Role 已添加',
            description: `${displayEmoji} → ${Formatters.roleMention(roleId)} 已添加到 Panel。`,
            color: Colors.SUCCESS,
          },
        ],
      });
      log.info({ guildId, messageId: panelId, emoji, roleId }, 'Reaction role added');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to add reaction role');
      await ctx.reply({
        embeds: [
          {
            title: '添加 Reaction Role 失敗',
            description: '添加 Reaction Role 時發生錯誤，請確認 emoji 格式正確。',
            color: Colors.ERROR,
          },
        ],
      });
    }
  });

  h.handler('remove', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;
    const emoji = normalizeEmojiForStorage(ctx.options.emoji);
    const emojiInput = ctx.options.emoji;

    const reactionRole = await module.getReactionRole(guildId, panelId, emoji);
    if (!reactionRole) {
      return ctx.reply({
        embeds: [
          {
            title: 'Reaction Role 不存在',
            description: `在 Panel \`${panelId}\` 中找不到 ${emojiInput} 的綁定。\n\n**提示**: 請使用 \`/reaction-role role-list\` 查看正確的 emoji 格式。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const panel = await module.getPanel(guildId, panelId);
    if (!panel) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 不存在',
            description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const displayEmoji = formatEmojiForDisplay(emoji);

    const ok = await ctx.confirm({
      title: '⚠️ 確認移除 Reaction Role',
      description: `即將從 Panel 中移除此 Reaction Role。`,
      fields: [
        {
          name: 'Reaction Role 資訊',
          value: [
            `**Panel**: ${panel.title} (\`${panelId}\`)`,
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
      await deleteDiscordReaction(actions, panel.channelId, panelId, reactionEmoji, {
        guildId,
        panelId,
      });

      const currentRoles = await module.getReactionRolesByMessage(guildId, panelId);
      await updatePanelMessage(
        actions,
        panel,
        currentRoles.filter((r) => r.emoji !== emoji)
      );

      await module.deleteReactionRole(guildId, panelId, emoji);

      await ctx.editReply({
        embeds: [
          {
            title: 'Reaction Role 已移除',
            description: `${displayEmoji} 的綁定已從 Panel 中移除。`,
            color: Colors.SUCCESS,
          },
        ],
        components: [],
      });
      log.info({ guildId, panelId, emoji }, 'Reaction role removed');
    } catch (error) {
      log.error({ error, guildId, panelId }, 'Failed to remove reaction role');
      await ctx.editReply({
        embeds: [
          {
            title: '移除 Reaction Role 失敗',
            description: '移除 Reaction Role 時發生錯誤，請稍後再試。',
            color: Colors.ERROR,
          },
        ],
        components: [],
      });
    }
  });

  h.handler('role-list', async (ctx) => {
    if (!ctx.guildId) return ctx.error('此指令只能在伺服器中使用');
    const guildId = ctx.guildId;
    const panelId = ctx.options.panel_id;

    const panel = await module.getPanel(guildId, panelId);
    if (!panel) {
      return ctx.reply({
        embeds: [
          {
            title: 'Panel 不存在',
            description: `找不到 ID 為 \`${panelId}\` 的 Panel。`,
            color: Colors.ERROR,
          },
        ],
      });
    }

    const roles = await module.getReactionRolesByMessage(guildId, panelId);

    if (roles.length === 0) {
      return ctx.reply({
        embeds: [
          {
            title: `${panel.title} - Reaction Roles`,
            description: '此 Panel 尚未添加任何 Reaction Role。\n使用 `/reaction-role add` 來添加。',
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
          title: `${panel.title} - Reaction Roles (${roles.length} 個)`,
          description: description + '\n\n**提示**: 移除時請複製上方的 `emoji:` 值使用。',
          color: Colors.INFO,
        },
      ],
    });
  });

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
            const allRoles = await module.getReactionRolesByMessage(guildId, messageId);

            for (const role of allRoles) {
              if (role.roleId !== match.roleId) {
                await actions
                  .removeRole(guildId, reaction.user_id, role.roleId)
                  .catch((err) => {
                    log.debug(
                      { error: err, roleId: role.roleId },
                      'Failed to remove role (user may not have it)'
                    );
                  });

                await actions
                  .deleteUserReaction(
                    reaction.channel_id,
                    reaction.message_id,
                    reaction.user_id,
                    role.emoji
                  )
                  .catch((err) => {
                    log.debug(
                      { error: err, emoji: role.emoji },
                      'Failed to remove reaction (may not exist)'
                    );
                  });
              }
            }

            log.debug(
              { userId: reaction.user_id },
              'Removed other roles and reactions (UNIQUE mode)'
            );
          }

          await actions.addRole(guildId, reaction.user_id, match.roleId);

          log.info(
            { guildId, userId: reaction.user_id, roleId: match.roleId, mode: match.mode },
            'Granted role via reaction'
          );

          // VERIFY mode: remove reaction after granting role
          if (match.mode === 'VERIFY') {
            await actions.deleteUserReaction(
              reaction.channel_id,
              reaction.message_id,
              reaction.user_id,
              emoji
            );
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

          const match = await service.findMatch(guildId, messageId, emoji);
          if (!match) return;

          // VERIFY mode does not remove role when reaction is removed
          if (match.mode === 'VERIFY') {
            log.debug({ userId: reaction.user_id }, 'Skipped role removal (VERIFY mode)');
            return;
          }

          await actions.removeRole(guildId, reaction.user_id, match.roleId);

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
