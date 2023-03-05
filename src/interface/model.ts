import { ModelAttributes } from "sequelize/types";

export interface Model {
    databaseName: string,
    schema: ModelAttributes
}