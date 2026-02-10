import { createStreamNotifyModule, StreamNotifyModule } from './stream-notify.module';
import { StreamNotifyService, createStreamNotifyService } from './stream-notify.service';
import { TwitchService } from './platforms/twitch.service';
import { StreamPlatformService } from './platforms/platform.interface';
import { createSchedulerService, SchedulerService } from '@core/scheduler';
import { createLogger } from '@core/logger';
import { Bot } from '@discordeno/bot';
import { lastValueFrom } from 'rxjs';

const log = createLogger('StreamNotifyFeature');

export interface StreamNotifyFeature {
  name: string;
  module: StreamNotifyModule;
  service: StreamNotifyService;
  cleanup: () => void;
}

export function setupStreamNotifyFeature(
  prisma: any,
  bot: Bot,
  scheduler: SchedulerService
): StreamNotifyFeature {
  const module = createStreamNotifyModule(prisma);
  const service = createStreamNotifyService(bot);

  const twitchService = new TwitchService(
    process.env.TWITCH_CLIENT_ID || '',
    process.env.TWITCH_CLIENT_SECRET || ''
  );

  const twitchTaskId = 'twitch-stream-check';

  scheduler.addTask({
    id: twitchTaskId,
    name: 'Twitch Stream Check',
    schedule: '*/1 * * * *',
    handler: async () => {
      try {
        await service.checkAllStreams(module, [twitchService]);
      } catch (error) {
        log.error({ error }, 'Twitch stream check failed');
      }
    },
    isActive: true,
  });

  const cleanup = () => {
    scheduler.removeTask(twitchTaskId);
    log.info('Stream notify feature cleaned up');
  };

  log.info('Stream notify feature setup complete');

  return {
    name: 'stream-notify',
    module,
    service,
    cleanup,
  };
}
