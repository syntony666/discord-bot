import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createGuildApi } from './guild.api';
import { useGuildHandlers } from './guild.handlers';

export const guildFeature = defineFeature()({
  name: 'guild',
  useHandlers: useGuildHandlers,
  deps: { api: { guild: createGuildApi(request) } },
});
