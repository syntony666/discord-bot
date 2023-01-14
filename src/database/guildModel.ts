import { STRING } from 'sequelize';
import { Model } from './model';

export const GuildModel: Model = {
    databaseName: 'guilds',
    schema: {
        guild_id: { type: STRING, primaryKey: true },
        guild_join_cid: STRING,
        guild_join_msg: STRING,
        guild_leave_cid: STRING,
        guild_leave_msg: STRING,
        message_delete_cid: STRING,
    }
}