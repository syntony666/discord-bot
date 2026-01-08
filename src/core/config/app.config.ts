import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    appId: requireEnv('DISCORD_APP_ID'),
  },
  database: {
    url: requireEnv('DATABASE_URL'),
  },
} as const;
