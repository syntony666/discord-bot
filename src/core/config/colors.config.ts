/**
 * Base color palette shared across the bot.
 * These are low-level colors without semantic meaning.
 */
export const BaseColors = {
  LIGHT_BLUE: 0x8bb7ff,
  DISCORD_BLUE: 0x5865f2,
  TWITCH_PURPLE: 0x9146ff,
  CYAN: 0x00d9ff,
  RED: 0xe6161a,
  PINK: 0xeb459e,
  GREEN: 0x57f287,
  DEEP_GREEN: 0x3ba55d,
  YELLOW: 0xfee75c,
  ORANGE: 0xf26522,
  GRAY: 0xded8d0,
  GRAY_BLUE: 0x99aab5,
} as const;

/**
 * Semantic colors for command responses (interactions).
 */
export const CommandColors = {
  SUCCESS: BaseColors.LIGHT_BLUE,
  ERROR: BaseColors.RED,
  INFO: BaseColors.GRAY,
  WARNING: BaseColors.YELLOW,
} as const;

/**
 * Semantic colors for notifications (message sends).
 */
export const NotificationColors = {
  STREAM_LIVE: BaseColors.TWITCH_PURPLE,
  MEMBER_JOIN: BaseColors.GREEN,
  MEMBER_LEAVE: BaseColors.GRAY_BLUE,
  ANNOUNCEMENT: BaseColors.DISCORD_BLUE,
} as const;

/**
 * Combined semantic colors for convenient imports.
 */
export const Colors = {
  ...CommandColors,
  ...NotificationColors,
} as const;

export type ColorType = (typeof Colors)[keyof typeof Colors];
