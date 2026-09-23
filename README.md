# Discord Bot

[![License](https://img.shields.io/github/license/syntony666/discord-bot)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?logo=discord&logoColor=white)](https://discord.com)

Modular Discord bot monorepo with keyword auto-replies, reaction roles, member join/leave notifications, and Twitch stream alerts. Built with TypeScript, RxJS, Hono, and Prisma + PostgreSQL. `apps/bot` handles Discord events and scheduled tasks; `apps/api` owns the database behind a small REST API; `packages/shared` carries the API contract (DTOs, enums, request helper, env loader); `packages/discord-client` wraps Discord REST/gateway access and the command/event runtime.

## Requirements

- Node.js 24+
- PostgreSQL
- A Discord application with the **Message Content** and **Server Members** privileged intents enabled
- Twitch app credentials (optional — only for stream notifications)

## Usage

```bash
npm install            # install workspaces; `prepare` also builds packages/*
cp example.env .env    # fill in values at repo root — shared by both apps
npm run prisma:init    # push the schema to the database (runs in apps/api)

npm run dev            # start API + bot together

# or separately:
npm run dev:api        # REST API on :3001  → curl localhost:3001/health
npm run dev:bot        # Discord bot, health endpoint on :3000/status
```

Other commands:

```bash
npm run build          # build all workspaces
npm run typecheck      # typecheck all workspaces
npm run prisma:migrate # create a migration
npm run format         # prettier --write .
```

## Useful Resources

- [example.env](./example.env) — all environment variables with comments
- [Discord Developer Portal](https://discord.com/developers/applications) — bot token, application id, intents
- [Prisma](https://www.prisma.io/docs) · [Hono](https://hono.dev) · [RxJS](https://rxjs.dev) · [Twitch EventSub](https://dev.twitch.tv/docs/eventsub/)
