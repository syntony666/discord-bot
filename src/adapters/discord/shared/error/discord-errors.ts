/**
 * Common Discord API error codes
 * @see https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
 */
export const DiscordErrorCodes = {
  /** Missing access to channel */
  MISSING_ACCESS: 50001,

  /** Missing required permissions */
  MISSING_PERMISSIONS: 50013,

  /** Unknown channel (deleted or invalid) */
  UNKNOWN_CHANNEL: 10003,

  /** Unknown message (deleted or invalid) */
  UNKNOWN_MESSAGE: 10008,

  /** Unknown role (deleted or invalid) */
  UNKNOWN_ROLE: 10011,

  /** Unknown emoji */
  UNKNOWN_EMOJI: 10014,
} as const;

export type DiscordErrorCode = (typeof DiscordErrorCodes)[keyof typeof DiscordErrorCodes];

/**
 * User-friendly error messages for Discord API errors
 */
export const DiscordErrorMessages: Record<number, string> = {
  [DiscordErrorCodes.MISSING_ACCESS]: '無法存取該頻道。',
  [DiscordErrorCodes.MISSING_PERMISSIONS]: 'Bot 缺少必要的權限。',
  [DiscordErrorCodes.UNKNOWN_CHANNEL]: '該頻道已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_MESSAGE]: '該訊息已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_ROLE]: '該身分組已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_EMOJI]: '該 emoji 不存在或無法使用。',
};
