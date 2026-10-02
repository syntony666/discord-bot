import { ActivityType, PresenceUpdateStatus } from 'discord-api-types/v10';
import type { GatewayActivityUpdateData, GatewayPresenceUpdateData } from 'discord-api-types/v10';

export interface ActivityConfig {
  type: number;
  text: string;
  url?: string;
}

export const ACTIVITY_LABEL: Record<number, string> = {
  [ActivityType.Playing]: '正在玩',
  [ActivityType.Streaming]: '直播中',
  [ActivityType.Listening]: '正在收聽',
  [ActivityType.Watching]: '正在觀看',
  [ActivityType.Custom]: '自訂',
  [ActivityType.Competing]: '正在比賽',
};

export function buildPresence(cfg: ActivityConfig): GatewayPresenceUpdateData {
  const activity: GatewayActivityUpdateData =
    cfg.type === ActivityType.Custom
      ? { name: 'Custom Status', type: ActivityType.Custom, state: cfg.text }
      : {
          name: cfg.text,
          type: cfg.type as ActivityType,
          ...(cfg.type === ActivityType.Streaming && cfg.url ? { url: cfg.url } : {}),
        };
  return {
    activities: [activity],
    status: PresenceUpdateStatus.Online,
    since: null,
    afk: false,
  };
}
