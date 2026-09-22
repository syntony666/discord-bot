import { defineFeature } from '@discord-bot/discord-client';
import { streamNotifyCommand } from './stream-notify.command';
import { useStreamNotifyHandlers } from './stream-notify.handlers';

export const streamNotifyFeature = defineFeature()({
  command: streamNotifyCommand,
  useHandlers: useStreamNotifyHandlers,
});
