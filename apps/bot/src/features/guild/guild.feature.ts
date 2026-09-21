import { defineFeature } from '@discord-bot/discord-client';
import { useGuildHandlers } from './guild.handlers';

export const guildFeature = defineFeature()({
  name: 'guild',
  useHandlers: useGuildHandlers,
});
