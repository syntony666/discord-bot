/**
 * Error context structure
 */
export interface ErrorContext {
  generic: string;
  duplicate?: string;
  notFound?: string;
  discordMissingPermissions?: string;
  discordMissingAccess?: string;
  discordUnknownMessage?: string;
  discordUnknownEmoji?: string;
}

/**
 * Centralized error message contexts for all commands.
 * Each context defines messages for specific error scenarios.
 */
export const ErrorContexts: Record<string, ErrorContext> = {
  // ==================== Keyword Feature ====================
  keywordAdd: {
    generic: '新增關鍵字時發生錯誤，請稍後再試。',
    duplicate: '此關鍵字已存在，請使用 /keyword edit 更新或先刪除原有規則。',
  },

  keywordEdit: {
    generic: '更新關鍵字時發生錯誤，請稍後再試。',
    notFound: '找不到此關鍵字。',
  },

  keywordDelete: {
    generic: '刪除關鍵字時發生錯誤，請稍後再試。',
    notFound: '找不到此關鍵字，可能已被其他人刪除。',
  },

  keywordList: {
    generic: '取得關鍵字列表時發生錯誤，請稍後再試。',
  },

  // ==================== Member Notify Feature ====================
  memberNotifySet: {
    generic: '設定成員通知時發生錯誤，請稍後再試。',
    discordMissingPermissions: 'Bot 沒有在該頻道發送訊息的權限。',
    discordMissingAccess: '無法存取該頻道。',
  },

  memberNotifyRemove: {
    generic: '移除成員通知時發生錯誤，請稍後再試。',
    notFound: '尚未設定成員通知。',
  },

  memberNotifyStatus: {
    generic: '查詢成員通知狀態時發生錯誤，請稍後再試。',
  },

  // ==================== Status Command ====================
  status: {
    generic: '取得機器人狀態時發生錯誤，請稍後再試。',
  },

  // ==================== Reaction Role - Panel ====================
  reactionRolePanelCreate: {
    generic: '建立 Panel 時發生錯誤。請確認 Bot 有在該頻道發送訊息的權限。',
    discordMissingPermissions: 'Bot 沒有在該頻道發送訊息的權限。',
    discordMissingAccess: '無法存取該頻道。',
  },

  reactionRolePanelList: {
    generic: '查詢 Panel 列表時發生錯誤。',
  },

  reactionRolePanelDelete: {
    generic: '刪除 Panel 時發生錯誤。',
    notFound: '找不到此 Panel。',
    discordUnknownMessage: 'Discord 訊息已被刪除。',
  },

  reactionRolePanelEdit: {
    generic: '更新 Panel 時發生錯誤。',
    notFound: '找不到此 Panel。',
    discordUnknownMessage: 'Discord 訊息已被刪除，無法更新。',
  },

  // ==================== Reaction Role - Role ====================
  reactionRoleRoleAdd: {
    generic: '添加 Reaction Role 時發生錯誤。',
    duplicate: '這個 emoji 已經綁定了身分組。',
    discordMissingPermissions: 'Bot 沒有新增反應的權限。',
    discordUnknownEmoji: '無法使用此 emoji，請確認 emoji 是否有效。',
  },

  reactionRoleRoleRemove: {
    generic: '移除 Reaction Role 時發生錯誤。',
    notFound: '找不到此 Reaction Role 綁定。',
  },

  reactionRoleRoleList: {
    generic: '查詢 Reaction Roles 時發生錯誤。',
  },
};

/**
 * Type-safe error context keys
 */
export type ErrorContextKey = keyof typeof ErrorContexts;
