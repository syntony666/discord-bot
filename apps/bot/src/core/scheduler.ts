import { createLogger } from '@discord-bot/shared';

const log = createLogger('Scheduler');

const tzParts = (d: Date, timeZone: string) => {
  const parts: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number };
};

// Find the UTC timestamp where `timeZone`'s wall clock reads y/mo/d h:mi.
// Iterating twice absorbs the tz offset (and most DST edge cases).
const wallToUtc = (y: number, mo: number, d: number, h: number, mi: number, timeZone: string) => {
  let t = Date.UTC(y, mo, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = tzParts(new Date(t), timeZone);
    t += Date.UTC(y, mo, d, h, mi) - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  }
  return t;
};

export const nextDailyAt = (time: string, timeZone: string) => {
  const [h = 0, mi = 0] = time.split(':').map(Number);
  const now = Date.now();
  for (let i = 0; i <= 1; i++) {
    const p = tzParts(new Date(now + i * 86_400_000), timeZone);
    const at = wallToUtc(+p.year, +p.month - 1, +p.day, h, mi, timeZone);
    if (at > now) return at;
  }
  return now + 86_400_000;
};

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
    daily(id: string, time: string, timeZone: string, handler: () => Promise<void>) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        throw new Error(`Invalid daily time "${time}", expected HH:mm`);
      }
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      const arm = () => {
        const delay = nextDailyAt(time, timeZone) - Date.now();
        timers.set(
          id,
          setTimeout(() => {
            void handler()
              .catch((err) => log.error({ err, task: id }, 'Scheduled task failed'))
              .finally(arm);
          }, delay)
        );
      };
      arm();
    },
    stop() {
      for (const timer of timers.values()) clearInterval(timer);
      timers.clear();
    },
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;

export const scheduler = createScheduler();
