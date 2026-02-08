export const ButtonStyles = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
  PREMIUM: 6,
} as const;

export type ButtonStyle = (typeof ButtonStyles)[keyof typeof ButtonStyles];
