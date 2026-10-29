import { defineFeature } from '@discord-bot/discord-client';
import { randomCommand } from './random.command';
import { useRandomHandlers } from './random.handlers';
import type { RandomDeps } from './random.handlers';

export const randomFeature = defineFeature({
  command: randomCommand,
  useHandlers: (deps: RandomDeps) => useRandomHandlers(deps),
  deps: {},
});
