import '@discord-bot/shared';
import { serve } from '@hono/node-server';
import { app } from './app';
import { connectPrisma, disconnectPrisma } from './db/client';

const port = Number(process.env.API_PORT ?? 3001);

async function main() {
  await connectPrisma();
  serve({ fetch: app.fetch, port });
  console.log(`API listening on :${port}`);
}

async function shutdown() {
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
