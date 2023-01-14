import { Sequelize } from "sequelize";
import { Model } from "../database/model";

export const DBConnectionService = (model: Model) => {
    const databaseName: any = process.env.DATABASE_NAME;
    const databaseUser: any = process.env.DATABASE_USER;
    const databasePassword: any = process.env.DATABASE_PASSWORD ?? null;
    const databaseHost: any = process.env.DATABASE_HOST;
    const client = new Sequelize(
        databaseName, databaseUser, databasePassword, {
        host: databaseHost,
        dialect: 'mariadb',
        logging: false,
    })
    return client.define(model.databaseName, model.schema)
}