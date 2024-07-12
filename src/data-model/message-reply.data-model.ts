import { DataTypes } from "sequelize";
import { DataModel } from "./data-model.interface";

export const MessageReplyModel: DataModel = {
  name: "message_reply",
  schema: {
    guild_id: DataTypes.BIGINT,
    last_editor_id: DataTypes.BIGINT,
    input: DataTypes.STRING,
    output: DataTypes.STRING,
  },
};
