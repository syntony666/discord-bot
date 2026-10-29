import { defineFeature } from '@discord-bot/discord-client';
import { sayCommand } from './say.command';
import { useSayHandlers } from './say.handlers';
import type { SayDeps } from './say.handlers';

export const sayFeature = defineFeature({
  command: sayCommand,
  useHandlers: (deps: SayDeps) => useSayHandlers(deps),
  deps: {},
});
