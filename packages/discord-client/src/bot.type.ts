import type { GatewayDispatchPayload } from 'discord-api-types/v10';
import type { Feature } from './features.type';
import type { EmbedTheme } from './internal/embeds';

export interface BotOptions {
  appId: string;
  onError?: (err: unknown) => void;
  theme: EmbedTheme;
}

export interface Bot {
  /** Registers features: commands + handlers + events + components in one pass. */
  register(...features: Feature[]): void;
  /** Pushes all registered command defs to Discord. */
  sync(): Promise<void>;
  /** Gateway dispatch entry point. Returns true when the payload was claimed. */
  handleDispatch(payload: GatewayDispatchPayload): boolean;
  close(): void;
}
