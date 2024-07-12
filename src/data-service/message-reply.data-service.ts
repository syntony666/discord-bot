import { WhereOptions } from "sequelize";
import { MessageReplyModel } from "../data-model/message-reply.data-model";
import { DataServiceManager } from "./data-service.manager";

export class MessageReplyDataService {
  private _client;
  private _attributes;
  constructor() {
    this._client = new DataServiceManager().getClient(MessageReplyModel);
    this._attributes = ["guild_id", "last_editor_id", "input", "output"];
  }
  public getData(guild_id: bigint, input?: string | WhereOptions<any>) {
    return this._client.findAll({
      where: input ? { guild_id, input } : { guild_id },
      attributes: this._attributes,
    });
  }
  public addData(
    guild_id: bigint,
    last_editor_id: bigint,
    input: string,
    output: string
  ) {
    return this._client.create({ guild_id, last_editor_id, input, output });
  }
  public editData(guild_id: bigint, input: string, output: string) {
    // this.data.set(input, output);
  }
  public removeData(guild_id: bigint, input: string) {
    // this.data.delete(input);
  }
}
