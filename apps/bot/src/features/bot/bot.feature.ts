import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createGuildApi } from '@features/guild/guild.api';
import { botCommand } from './bot.command';
import { useBotHandlers } from './bot.handlers';
import type { BotDeps } from './bot.handlers';

export const botFeature = defineFeature()({
  command: botCommand,
  useHandlers: (deps: BotDeps) => useBotHandlers(deps),
  deps: {
    api: {
      guild: createGuildApi(request),
    },
  },
});
