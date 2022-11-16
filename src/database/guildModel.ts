import { STRING } from 'sequelize';
import { Model } from './model';

export const GuildModel: Model = {
    databaseName: 'guilds',
    schema: {
        guild_id: { type: STRING, primaryKey: true },
        join_channel_id: STRING,
        join_message: STRING,
        leave_channel_id: STRING,
        leave_message: STRING,
        delete_notification_channel_id: STRING,
    }
}