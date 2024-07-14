const DISCORD_EPOCH = 1420070400000n; // Discord 紀元 (2015-01-01T00:00:00Z)

export class SnowflakeHelper {
  private _snowflake: bigint;

  constructor(snowflake: bigint) {
    this._snowflake = snowflake;
  }

  public get timestamp() {
    return Number(((this._snowflake >> 22n) + DISCORD_EPOCH) / 1000n);
  }

  public get workerId() {
    return Number((this._snowflake >> 17n) & 0b11111n);
  }

  public get processId() {
    return Number((this._snowflake >> 12n) & 0b11111n);
  }

  public get increment() {
    return Number(this._snowflake & 0b111111111111n);
  }
}
