import type { DiscordActions } from '@core/discord/discord-actions';
import { createLogger } from '@core/logger';
import type { BotGuild } from '@core/rx/bus';

const log = createLogger('StatusOperations');

// Global start time for the bot
const botStartTime = new Date();

export async function getBotStatus(actions: DiscordActions): Promise<{
  uptime: number;
  startTime: Date;
  guildCount: number;
  userCount: number;
  memoryUsage: number;
}> {
  try {
    const startTime = botStartTime;
    const uptime = Date.now() - startTime.getTime();

    // Get guild count (simplified version)
    const guildCount = 0; // TODO: Implement proper guild counting

    // Get user count (simplified version)
    const userCount = 0; // TODO: Implement proper user counting

    // Get memory usage (Node.js process)
    const memoryUsage = process.memoryUsage().heapUsed;

    return {
      uptime,
      startTime,
      guildCount,
      userCount,
      memoryUsage,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get actions status');
    throw error;
  }
}

export async function getGuildInfo(actions: DiscordActions, guildId: string): Promise<BotGuild | null> {
  try {
    const guild = await actions.getGuild(BigInt(guildId));
    return guild as BotGuild;
  } catch (error) {
    log.error({ error, guildId }, 'Failed to get guild info');
    return null;
  }
}
