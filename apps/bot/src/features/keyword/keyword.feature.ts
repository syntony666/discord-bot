import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createKeywordApi } from './keyword.api';
import { keywordCommand } from './keyword.command';
import { useKeywordHandlers } from './keyword.handlers';

export const keywordFeature = defineFeature()({
  command: keywordCommand,
  useHandlers: useKeywordHandlers,
  deps: { api: { keyword: createKeywordApi(request) } },
});
