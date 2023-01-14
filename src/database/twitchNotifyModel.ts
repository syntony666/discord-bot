import { STRING } from 'sequelize';
import { Model } from './model';

export const TwitchNotifyModel: Model = {
    databaseName: 'twitch_notifies',
    schema: {
        guild_id: STRING,
        channel_id: STRING,
        twitch_id: STRING,
    }
}
