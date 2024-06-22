import { ModelAttributes } from "sequelize";

export interface DataModel {
  name: string;
  schema: ModelAttributes;
}
