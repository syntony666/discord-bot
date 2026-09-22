import { defineFeature } from '@discord-bot/discord-client';
import { memberNotifyCommand } from './member-notify.command';
import { useMemberNotifyHandlers } from './member-notify.handlers';

export const memberNotifyFeature = defineFeature()({
  command: memberNotifyCommand,
  useHandlers: useMemberNotifyHandlers,
});
