import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createGuildApi } from '@features/guild/guild.api';
import { createMemberNotifyApi } from './member.api';
import { notifyCommand } from './notify.command';
import { useMemberNotifyHandlers } from './member.handlers';

export const notifyFeature = defineFeature()({
  command: notifyCommand,
  useHandlers: useMemberNotifyHandlers,
  deps: {
    api: {
      memberNotify: createMemberNotifyApi(request),
      guild: createGuildApi(request),
    },
  },
});
