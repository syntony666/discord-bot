import { DataTypes } from "sequelize";
import { DataModel } from "./data-model.interface";

export const MessageReplyModel: DataModel = {
  name: "message_reply",
  schema: {
    guild_id: DataTypes.STRING,
    last_editor_id: DataTypes.STRING,
    request: DataTypes.STRING,
    response: DataTypes.STRING,
  },
};
