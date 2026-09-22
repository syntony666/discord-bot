import { defineFeature } from '@discord-bot/discord-client';
import { reactionRoleCommand } from './reaction-role.command';
import { useReactionRoleHandlers } from './reaction-role.handlers';

export const reactionRoleFeature = defineFeature()({
  command: reactionRoleCommand,
  useHandlers: useReactionRoleHandlers,
});
