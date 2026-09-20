import '@discord-bot/shared';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  health: {
    port: Number(process.env.HEALTH_PORT ?? '3000'),
  },
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    appId: requireEnv('DISCORD_APP_ID'),
  },
  api: {
    url: process.env.API_URL ?? 'http://localhost:3001',
  },
  footerIconUrl: 'https://cdn.jsdelivr.net/gh/syntony666/cdn/logo-128x128.png',
} as const;
