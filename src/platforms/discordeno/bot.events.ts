import { CreateBotOptions, DesiredPropertiesBehavior } from '@discordeno/bot';
import { BotDesiredProperties } from '@core/config';
import { emitMessageCreate, emitInteractionCreate, emitReady } from '@core/rx/bus';
import { createLogger } from '@core/logger';

const log = createLogger('BotEvents');

export const botEventHandlers: CreateBotOptions<
  BotDesiredProperties,
  DesiredPropertiesBehavior.RemoveKey
>['events'] = {
  ready(_bot, payload) {
    const shardId = payload.shard?.[0] ?? 0;
    log.debug({ user: payload.user, shardId }, 'Ready event received');
    emitReady({ user: payload.user, shardId });
  },

  messageCreate(message) {
    emitMessageCreate(message);
  },

  interactionCreate(interaction) {
    emitInteractionCreate(interaction);
  },
};
