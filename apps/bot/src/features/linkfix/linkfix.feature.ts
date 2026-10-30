import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createAutoApi } from '../auto/auto.api';
import { linkfixCommand } from './linkfix.command';
import { useLinkfixHandlers } from './linkfix.handlers';

export const linkfixFeature = defineFeature({
  command: linkfixCommand,
  useHandlers: useLinkfixHandlers,
  deps: { api: { auto: createAutoApi(request) } },
});
