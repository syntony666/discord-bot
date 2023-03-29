import { STRING } from 'sequelize';
import { Model } from "../interface/model";

export const TwitchNotifyModel: Model = {
  databaseName: "twitch_notifies",
  schema: {
    guild_id: STRING,
    channel_id: STRING,
    twitch_id: STRING,
    message: STRING,
  },
};
