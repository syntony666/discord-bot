import { STRING } from 'sequelize';
import { Model } from "../interface/model";

export const ReplyModel: Model = {
    databaseName: 'reply_message',
    schema: {
        guild_id: STRING,
        last_editor_id: STRING,
        request: STRING,
        response: STRING
    }
}