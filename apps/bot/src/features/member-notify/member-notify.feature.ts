import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createGuildApi } from '@features/guild/guild.api';
import { createMemberNotifyApi } from './member-notify.api';
import { memberNotifyCommand } from './member-notify.command';
import { useMemberNotifyHandlers } from './member-notify.handlers';

export const memberNotifyFeature = defineFeature()({
  command: memberNotifyCommand,
  useHandlers: useMemberNotifyHandlers,
  deps: {
    api: {
      memberNotify: createMemberNotifyApi(request),
      guild: createGuildApi(request),
    },
  },
});
