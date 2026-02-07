export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  isActive: boolean;
}

export interface SchedulerService {
  addTask(task: ScheduledTask): void;
  removeTask(id: string): void;
  start(): void;
  stop(): void;
  getActiveTasks(): ScheduledTask[];
}

export function createSchedulerService(): SchedulerService {
  const tasks = new Map<string, ScheduledTask>();
  const intervals = new Map<string, NodeJS.Timeout>();
  let isRunning = false;

  const parseCronExpression = (cron: string): number => {
    const parts = cron.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression format');
    }

    const [minute = '*', hour = '*', dayOfMonth = '*', month = '*', dayOfWeek = '*'] = parts;

    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 1000;
    }

    if (minute.startsWith('*/')) {
      const intervalMinutes = parseInt(minute.slice(2));
      if (!isNaN(intervalMinutes)) {
        return intervalMinutes * 60 * 1000;
      }
    }

    throw new Error(`Unsupported cron expression: ${cron}`);
  };

  const addTask = (task: ScheduledTask): void => {
    tasks.set(task.id, task);
    
    if (isRunning && task.isActive) {
      const intervalMs = parseCronExpression(task.schedule);
      const timeout = setInterval(task.handler, intervalMs);
      intervals.set(task.id, timeout);
    }
  };

  const removeTask = (id: string): void => {
    tasks.delete(id);
    
    const timeout = intervals.get(id);
    if (timeout) {
      clearInterval(timeout);
      intervals.delete(id);
    }
  };

  const start = (): void => {
    if (isRunning) return;
    
    isRunning = true;
    
    for (const [id, task] of tasks) {
      if (task.isActive) {
        try {
          const intervalMs = parseCronExpression(task.schedule);
          const timeout = setInterval(task.handler, intervalMs);
          intervals.set(id, timeout);
        } catch (error) {
          console.error(`Failed to schedule task ${task.name}:`, error);
        }
      }
    }
  };

  const stop = (): void => {
    isRunning = false;
    
    for (const [id, timeout] of intervals) {
      clearInterval(timeout);
    }
    intervals.clear();
  };

  const getActiveTasks = (): ScheduledTask[] => {
    return Array.from(tasks.values()).filter(task => task.isActive);
  };

  return {
    addTask,
    removeTask,
    start,
    stop,
    getActiveTasks,
  };
}
