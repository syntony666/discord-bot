import { EventHandlers } from "discordeno/*";

export const ready: Partial<EventHandlers> = {
  ready(bot, payload, rawPayload) {
    console.log(
      `Successfully connected Shard ${payload.shardId} to the gateway`
    );
  },
};

module.exports = ready;
