import { GuildModel } from "../data-model/guild.data-model";
import { DataServiceManager } from "./data-service.manager";

export class GuildDataService {
  private _client;
  private _attributes;
  constructor() {
    this._client = new DataServiceManager().getClient(GuildModel);
    this._attributes = [
      "id",
      "guild_join_cid",
      "guild_join_msg",
      "guild_leave_cid",
      "guild_leave_msg",
      "message_delete_cid",
    ];
  }
  public getData(id?: bigint) {
    return this._client.findAll({
      where: id ? { id } : {},
      attributes: this._attributes,
    });
  }
  public addData(id: bigint) {
    return this._client.create({ id });
  }
  public addBulkData(ids: bigint[]) {
    const schema = ids.map((id) => ({ id }));
    return this._client.bulkCreate(schema);
  }
  public editData(guild_id: bigint, prefix: string) {
    // this.data.set(input, output);
  }
  public removeData(guild_id: bigint) {
    // this.data.delete(input);
  }
}
