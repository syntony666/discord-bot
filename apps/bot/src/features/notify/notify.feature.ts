import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { scheduler } from '@core/scheduler';
import { createGuildApi } from '@features/guild/guild.api';
import { createMemberNotifyApi } from './member.api';
import { createStreamNotifyApi } from './stream.api';
import { notifyCommand } from './notify.command';
import { useMemberNotifyHandlers } from './member.handlers';
import type { MemberNotifyDeps } from './member.handlers';
import { useStreamNotifyHandlers } from './stream.handlers';
import type { StreamNotifyDeps } from './stream.handlers';

type NotifyDeps = MemberNotifyDeps & StreamNotifyDeps;

export const notifyFeature = defineFeature()({
  command: notifyCommand,
  useHandlers: (deps: NotifyDeps) => {
    const member = useMemberNotifyHandlers(deps);
    const stream = useStreamNotifyHandlers(deps);
    return {
      handler: { ...member.handler, ...stream.handler },
      event: { ...member.event, ...stream.event },
      stream: { ...member.stream, ...stream.stream },
      component: { ...member.component, ...stream.component },
    };
  },
  deps: {
    api: {
      memberNotify: createMemberNotifyApi(request),
      guild: createGuildApi(request),
      streamNotify: createStreamNotifyApi(request),
    },
    scheduler,
  },
});
