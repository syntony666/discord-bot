import { createLogger } from '@discord-bot/shared';

const log = createLogger('Scheduler');

export function createScheduler() {
  const timers = new Map<string, NodeJS.Timeout>();

  return {
    every(id: string, intervalMs: number, handler: () => Promise<void>) {
      const existing = timers.get(id);
      if (existing) clearInterval(existing);
      timers.set(
        id,
        setInterval(() => {
          handler().catch((err) => log.error({ err, task: id }, 'Scheduled task failed'));
        }, intervalMs)
      );
    },
    stop() {
      for (const timer of timers.values()) clearInterval(timer);
      timers.clear();
    },
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;

export const scheduler = createScheduler();
