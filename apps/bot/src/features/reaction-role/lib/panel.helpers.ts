import { Colors } from '@core/config/colors.config';
import type { ReactionRole, ReactionRoleMode } from '@discord-bot/shared';
import { formatEmojiForDisplay } from './emoji.helper';

export interface BuildPanelEmbedOptions {
  title?: string;
  description?: string;
  mode: ReactionRoleMode;
  roles: Array<Pick<ReactionRole, 'emoji' | 'roleId' | 'description'>>;
  messageId?: string;
}

export function buildPanelEmbed(options: BuildPanelEmbedOptions) {
  const { title, description, mode, roles, messageId } = options;

  return {
    embeds: [
      {
        title: title || '選擇你的身分組',
        description: description || '點擊下方的反應來獲得對應的身分組。\n再次點擊可以移除身分組。',
        color: Colors.INFO,
        fields: [
          {
            name: '模式',
            value: getModeText(mode),
            inline: false,
          },
          {
            name: '身分組列表',
            value:
              roles.length > 0
                ? roles
                    .map((r) => {
                      const displayEmoji = formatEmojiForDisplay(r.emoji);
                      return `${displayEmoji} → <@&${r.roleId}>${r.description ? ` - ${r.description}` : ''}`;
                    })
                    .join('\n')
                : '⏳ 尚未添加任何身分組',
            inline: false,
          },
        ],
        footer: messageId
          ? {
              text: `Panel ID: ${messageId}`,
            }
          : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function getModeText(mode: ReactionRoleMode): string {
  switch (mode) {
    case 'NORMAL':
      return '📋 多選模式';
    case 'UNIQUE':
      return '⚠️ 單選模式';
    case 'VERIFY':
      return '✅ 驗證模式';
    default:
      return '📋 多選模式';
  }
}
