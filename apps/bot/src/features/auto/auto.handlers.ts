import { useHandlers } from '@discord-bot/discord-client';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { AutoFeatureType, createLogger } from '@discord-bot/shared';
import { autoCommand } from './auto.command';
import type { AutoApi } from './auto.api';

const log = createLogger('Auto');

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface AutoDeps {
  discord: DiscordHelpers;
  api: { auto: AutoApi };
}

export function useAutoHandlers(deps: AutoDeps) {
  const api = deps.api.auto;
  const h = useHandlers(autoCommand);

  h.handler('linkfix.enable', async (ctx) => {
    await api.setFeature(ctx.guildId, AutoFeatureType.LINKFIX, true);
    await ctx.success(
      '連結修復已啟用',
      '訊息中的 **X**、**Instagram**、**TikTok**、**Pixiv**、**Threads**、**Facebook** 連結會自動修復預覽。'
    );
    log.info({ guildId: ctx.guildId }, 'Linkfix enabled');
  });

  h.handler('linkfix.disable', async (ctx) => {
    await api.setFeature(ctx.guildId, AutoFeatureType.LINKFIX, false);
    await ctx.info('連結修復已停用');
    log.info({ guildId: ctx.guildId }, 'Linkfix disabled');
  });

  h.handler('linkfix.status', async (ctx) => {
    const cfg = await api.getFeature(ctx.guildId, AutoFeatureType.LINKFIX);
    await ctx.info('連結修復狀態', `目前為 **${cfg?.enabled ? '啟用' : '停用'}**`);
  });

  return h.collect();
}
