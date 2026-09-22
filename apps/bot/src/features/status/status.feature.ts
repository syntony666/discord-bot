import { defineFeature } from '@discord-bot/discord-client';
import { statusCommand } from './status.command';
import { useStatusHandlers } from './status.handlers';

export const statusFeature = defineFeature()({
  command: statusCommand,
  useHandlers: useStatusHandlers,
});
