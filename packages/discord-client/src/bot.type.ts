import type { GatewayDispatchPayload } from 'discord-api-types/v10';
import type { Feature } from './features.type';

export interface BotOptions<Deps> {
  appId: string;
  deps: Deps;
  onError?: (err: unknown) => void;
}

export interface Bot<Deps = unknown> {
  /** Registers features: commands + handlers + events + components in one pass. */
  register(...features: Feature<Deps>[]): void;
  /** Pushes all registered command defs to Discord. */
  sync(): Promise<void>;
  /** Gateway dispatch entry point. Returns true when the payload was claimed. */
  handleDispatch(payload: GatewayDispatchPayload): boolean;
  close(): void;
}
