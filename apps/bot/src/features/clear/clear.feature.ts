import { defineFeature } from '@discord-bot/discord-client';
import { clearCommand } from './clear.command';
import { useClearHandlers } from './clear.handlers';
import type { ClearDeps } from './clear.handlers';

export const clearFeature = defineFeature({
  command: clearCommand,
  useHandlers: (deps: ClearDeps) => useClearHandlers(deps),
  deps: {},
});
