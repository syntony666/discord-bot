import { BOOLEAN, STRING } from 'sequelize';
import { Model } from './model';

export const TwitchStatusModel: Model = {
    databaseName: 'twitch_statuses',
    schema: {
        twitch_id: { type: STRING, primaryKey: true },
        is_streaming: BOOLEAN,
    }
}
