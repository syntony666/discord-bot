import { DataTypes } from "sequelize";
import { DataModel } from "./data-model.interface";

export const GuildModel: DataModel = {
  name: "guilds",
  schema: {
    guild_id: { type: DataTypes.STRING, primaryKey: true },
    guild_join_cid: DataTypes.STRING,
    guild_join_msg: DataTypes.STRING,
    guild_leave_cid: DataTypes.STRING,
    guild_leave_msg: DataTypes.STRING,
    message_delete_cid: DataTypes.STRING,
  },
};
