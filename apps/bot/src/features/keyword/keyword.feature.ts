import { defineFeature } from '@discord-bot/discord-client';
import { keywordCommand } from './keyword.command';
import { useKeywordHandlers } from './keyword.handlers';

export const keywordFeature = defineFeature()({
  command: keywordCommand,
  useHandlers: useKeywordHandlers,
});
