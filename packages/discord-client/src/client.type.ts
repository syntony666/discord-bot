import type { GatewayDispatchPayload, GatewayReadyDispatchData } from 'discord-api-types/v10';

export interface GatewayConnectOptions {
  intents: number;
  onDispatch: (payload: GatewayDispatchPayload) => void;
  onReady?: (data: GatewayReadyDispatchData, shardId: number) => void;
  onLog?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface GatewaySession {
  close(): void;
}
