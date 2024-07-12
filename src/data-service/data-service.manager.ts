import { Sequelize } from "sequelize";
import { DataModel } from "../data-model/data-model.interface";
import { resolve } from "path";

const env = process.env.NODE_ENV || "development";
const config = require(resolve(__dirname, "../../sequelize-config.json"))[env];

export class DataServiceManager {
  private _sequelize: Sequelize;

  constructor() {
    this._sequelize = this.initSequelize();
  }

  private initSequelize() {
    return new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );
  }

  public get sequelize(): Sequelize {
    return this._sequelize;
  }

  public getClient(model: DataModel) {
    return this._sequelize.define(model.name, model.schema, {
      freezeTableName: true,
    });
  }
}
