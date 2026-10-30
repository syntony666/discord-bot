import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createAutoApi } from './auto.api';
import { autoCommand } from './auto.command';
import { useAutoHandlers } from './auto.handlers';

export const autoFeature = defineFeature({
  command: autoCommand,
  useHandlers: useAutoHandlers,
  deps: { api: { auto: createAutoApi(request) } },
});
