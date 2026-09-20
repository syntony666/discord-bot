import { appConfig } from '@core/config';
import { ready$ } from '@core/rx/bus';
import { StatusPayload } from './health.server';

let discordReady = false;

ready$.subscribe(() => {
  discordReady = true;
});

export async function buildStatusPayload(): Promise<StatusPayload> {
  const checks: StatusPayload['checks'] = {};
  let status: StatusPayload['status'] = 'ok';

  const apiStart = Date.now();
  try {
    const response = await fetch(`${appConfig.api.url}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    checks.api = { ok: true, latencyMs: Date.now() - apiStart };
  } catch (error) {
    status = 'error';
    checks.api = {
      ok: false,
      latencyMs: Date.now() - apiStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  if (!discordReady) {
    status = 'error';
    checks.discord = { ok: false, error: 'Bot not ready' };
  } else {
    checks.discord = { ok: true };
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}
