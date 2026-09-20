export const avatarUrl = (
  userId: string,
  avatarHash?: string | null,
  discriminator = '0'
): string =>
  avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discriminator) % 5}.png`;

export const guildIconUrl = (guildId: string, iconHash?: string | null): string | undefined =>
  iconHash ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png` : undefined;
