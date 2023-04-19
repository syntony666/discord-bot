import { Sequelize } from "sequelize";
import { Model } from "../interface/model";

export const DBConnectionService = (model: Model) => {
    const databaseName: any = process.env.MARIADB_DATABASE;
    const databaseUser: any = process.env.MARIADB_USER;
    const databasePassword: any = process.env.MARIADB_ROOT_PASSWORD ?? null;
    const databaseHost: any = process.env.DATABASE_HOST;
    const client = new Sequelize(
        databaseName, databaseUser, databasePassword, {
        host: databaseHost,
        dialect: 'mariadb',
        logging: false,
    })
    return client.define(model.databaseName, model.schema)
}