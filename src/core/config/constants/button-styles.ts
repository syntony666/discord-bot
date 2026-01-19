/**
 * Discord button style constants
 * @see https://discord.com/developers/docs/interactions/message-components#button-object-button-styles
 */
export const ButtonStyles = {
  /** Primary button (blue) - Main action */
  PRIMARY: 1,

  /** Secondary button (grey) - Alternative action */
  SECONDARY: 2,

  /** Success button (green) - Positive confirmation */
  SUCCESS: 3,

  /** Danger button (red) - Destructive action */
  DANGER: 4,

  /** Link button (grey) - Navigation */
  LINK: 5,

  /** Premium button - Purchase action */
  PREMIUM: 6,
} as const;

export type ButtonStyle = (typeof ButtonStyles)[keyof typeof ButtonStyles];
