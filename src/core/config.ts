import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  discordToken: requireEnv('DISCORD_TOKEN'),
  discordAppId: requireEnv('DISCORD_APP_ID'),
  databaseUrl: requireEnv('DATABASE_URL'),
};
