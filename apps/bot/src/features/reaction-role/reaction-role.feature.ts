import { defineFeature } from '@discord-bot/discord-client';
import { request } from '@core/request';
import { createReactionRoleApi } from './reaction-role.api';
import { reactionRoleCommand } from './reaction-role.command';
import { useReactionRoleHandlers } from './reaction-role.handlers';

export const reactionRoleFeature = defineFeature()({
  command: reactionRoleCommand,
  useHandlers: useReactionRoleHandlers,
  deps: { api: { reactionRole: createReactionRoleApi(request) } },
});
