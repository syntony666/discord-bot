import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createGuildApi } from '@features/guild/guild.api';
import { createKeywordApi } from '@features/keyword/keyword.api';
import { createMemberNotifyApi } from '@features/notify/member.api';
import { createReactionRoleApi } from '@features/reaction-role/reaction-role.api';
import { createStreamNotifyApi } from '@features/notify/stream.api';
import { statusCommand } from './status.command';
import { useStatusHandlers } from './status.handlers';

export const statusFeature = defineFeature()({
  command: statusCommand,
  useHandlers: useStatusHandlers,
  deps: {
    api: {
      guild: createGuildApi(request),
      memberNotify: createMemberNotifyApi(request),
      streamNotify: createStreamNotifyApi(request),
      keyword: createKeywordApi(request),
      reactionRole: createReactionRoleApi(request),
    },
  },
});
