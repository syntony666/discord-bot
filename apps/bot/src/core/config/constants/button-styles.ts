import { ButtonStyle } from 'discord-api-types/v10';

export { ButtonStyle };

export const ButtonStyles = {
  PRIMARY: ButtonStyle.Primary,
  SECONDARY: ButtonStyle.Secondary,
  SUCCESS: ButtonStyle.Success,
  DANGER: ButtonStyle.Danger,
  LINK: ButtonStyle.Link,
  PREMIUM: ButtonStyle.Premium,
} as const;
