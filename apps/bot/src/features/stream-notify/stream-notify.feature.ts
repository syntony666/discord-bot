import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { scheduler } from '@core/scheduler';
import { createStreamNotifyApi } from './stream-notify.api';
import { streamNotifyCommand } from './stream-notify.command';
import { useStreamNotifyHandlers } from './stream-notify.handlers';

export const streamNotifyFeature = defineFeature()({
  command: streamNotifyCommand,
  useHandlers: useStreamNotifyHandlers,
  deps: {
    api: { streamNotify: createStreamNotifyApi(request) },
    scheduler,
  },
});
