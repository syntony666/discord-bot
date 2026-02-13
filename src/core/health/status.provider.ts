import { prisma } from '@platforms/database/prisma.client';
import { ready$ } from '@core/rx/bus';
import { StatusPayload } from './health.server';

let discordReady = false;

ready$.subscribe(() => {
  discordReady = true;
});

export async function buildStatusPayload(): Promise<StatusPayload> {
  const checks: StatusPayload['checks'] = {};
  let status: StatusPayload['status'] = 'ok';

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (error) {
    status = 'error';
    checks.database = {
      ok: false,
      latencyMs: Date.now() - dbStart,
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
