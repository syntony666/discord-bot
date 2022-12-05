import { BOOLEAN, STRING } from 'sequelize';
import { Model } from './model';

export const TwitchModifyModel: Model = {
    databaseName: 'twitch_notifies',
    schema: {
        twitch_id: { type: STRING, primaryKey: true },
        is_streaming: BOOLEAN,
    }
}