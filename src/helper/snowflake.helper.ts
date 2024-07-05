export const SnowflakeHelper = {
  getCreationTime: (snowflake: bigint) => {
    const discordEpoch = 1420070400000; // Discord 紀元 (2015-01-01T00:00:00Z)
    const timestamp = snowflake >> BigInt(22); // 取前 42 位
    const creationTime = new Date(Number(timestamp) + discordEpoch);
    return creationTime;
  },
};
