export const DiscordErrorCodes = {
  MISSING_ACCESS: 50001,
  MISSING_PERMISSIONS: 50013,
  UNKNOWN_CHANNEL: 10003,
  UNKNOWN_MESSAGE: 10008,
  UNKNOWN_ROLE: 10011,
  UNKNOWN_EMOJI: 10014,
} as const;

export type DiscordErrorCode = (typeof DiscordErrorCodes)[keyof typeof DiscordErrorCodes];

export const DiscordErrorMessages: Record<number, string> = {
  [DiscordErrorCodes.MISSING_ACCESS]: '無法存取該頻道。',
  [DiscordErrorCodes.MISSING_PERMISSIONS]: 'Bot 缺少必要的權限。',
  [DiscordErrorCodes.UNKNOWN_CHANNEL]: '該頻道已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_MESSAGE]: '該訊息已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_ROLE]: '該身分組已被刪除或不存在。',
  [DiscordErrorCodes.UNKNOWN_EMOJI]: '該 emoji 不存在或無法使用。',
};
