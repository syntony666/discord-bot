import { EventHandlers } from "discordeno/*";
import { GuildDataService } from "../data-service/guild.data-service";

export const ready: Partial<EventHandlers> = {
  async ready(bot, payload, rawPayload) {
    await prepareDatabase(payload.guilds);
    console.info(
      `Successfully connected Shard ${payload.shardId} to the gateway`
    );
  },
};

async function prepareDatabase(guilds: bigint[]) {
  const guildFound = await new GuildDataService().getData();
  const guildInDB = guildFound.map((guild) =>
    BigInt(guild.get("id") as string)
  );
  const guildToCreate = guilds.filter((guild) => !guildInDB.includes(guild));
  await new GuildDataService().addBulkData(guildToCreate);
}

module.exports = ready;
