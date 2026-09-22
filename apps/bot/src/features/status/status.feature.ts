import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createKeywordApi } from '@features/keyword/keyword.api';
import { createMemberNotifyApi } from '@features/member-notify/member-notify.api';
import { createReactionRoleApi } from '@features/reaction-role/reaction-role.api';
import { createStreamNotifyApi } from '@features/stream-notify/stream-notify.api';
import { statusCommand } from './status.command';
import { useStatusHandlers } from './status.handlers';

export const statusFeature = defineFeature()({
  command: statusCommand,
  useHandlers: useStatusHandlers,
  deps: {
    api: {
      memberNotify: createMemberNotifyApi(request),
      streamNotify: createStreamNotifyApi(request),
      keyword: createKeywordApi(request),
      reactionRole: createReactionRoleApi(request),
    },
  },
});
