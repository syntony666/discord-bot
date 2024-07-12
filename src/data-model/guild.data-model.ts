import { DataTypes } from "sequelize";
import { DataModel } from "./data-model.interface";

export const GuildModel: DataModel = {
  name: "guild",
  schema: {
    id: { type: DataTypes.BIGINT, primaryKey: true },
    guild_join_cid: DataTypes.BIGINT,
    guild_join_msg: DataTypes.STRING,
    guild_leave_cid: DataTypes.BIGINT,
    guild_leave_msg: DataTypes.STRING,
    message_delete_cid: DataTypes.BIGINT,
  },
};
