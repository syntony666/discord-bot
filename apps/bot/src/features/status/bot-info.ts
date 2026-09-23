import { readFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '@discord-bot/shared';

const log = createLogger('BotInfo');

interface VersionInfo {
  version: string;
}

let cachedVersion: VersionInfo | null = null;

export function getBotVersion(): VersionInfo {
  if (cachedVersion) return cachedVersion;

  try {
    const packagePath = join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    cachedVersion = {
      version: packageJson.version || '0.0.0',
    };

    return cachedVersion;
  } catch (error) {
    log.error({ error }, 'Failed to read package.json');
    return { version: 'unknown' };
  }
}

export function getUptime(): string {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '< 1m';
}
