import { STRING } from 'sequelize';
import { Model } from "../interface/model";

export const ReactionRoleModel: Model = {
    databaseName: 'reaction_roles',
    schema: {
        role_id: { type: STRING, primaryKey: true },
        reaction: STRING,
        guild_id: STRING,
        message_url: {
            type: STRING,
        }
    }
}