export const BaseColors = {
  LIGHT_BLUE: 0x8bb7ff,
  DISCORD_BLUE: 0x5865f2,
  TWITCH_PURPLE: 0x9146ff,
  YOUTUBE_RED: 0xff0000,
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

// Per-platform live-notification colors. When a new platform is added to
// StreamPlatform (shared enum + prisma), assign its color here.
export const StreamLiveColors = {
  TWITCH: BaseColors.TWITCH_PURPLE,
  YOUTUBE: BaseColors.YOUTUBE_RED,
} as const;

export const Colors = {
  SUCCESS: BaseColors.LIGHT_BLUE,
  ERROR: BaseColors.RED,
  INFO: BaseColors.GRAY,
  WARNING: BaseColors.YELLOW,
  MEMBER_JOIN: BaseColors.GREEN,
  MEMBER_LEAVE: BaseColors.GRAY_BLUE,
} as const;
