# Discord Bot

[![License](https://img.shields.io/github/license/syntony666/discord-bot)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?logo=discord&logoColor=white)](https://discord.com)

[![view - Documentation](https://img.shields.io/badge/view-Documentation-834abe?style=for-the-badge)](https://discord-bot.syntony666.com)

Modular Discord bot monorepo with keyword auto-replies, reaction roles, member join/leave notifications, and Twitch stream alerts. Built with TypeScript, RxJS, Hono, and Prisma + PostgreSQL. `apps/bot` handles Discord events and scheduled tasks; `apps/api` owns the database behind a small REST API; `apps/doc` is the VitePress documentation site; `packages/shared` carries the API contract (DTOs, enums, request helper, env loader); `packages/discord-client` wraps Discord REST/gateway access and the command/event runtime.

## Requirements

- Node.js 22+
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
npm test               # node --test across apps/*/test and packages/*/test
npm run prisma:migrate # create a migration
npm run format         # prettier --write .
npm run format:check   # prettier --check (CI gate)
```

## Owner commands

`/bot` is gated at runtime to the application owner (personal app: `owner.id`; team app: owner + accepted admin/developer members). `DISCORD_OWNER_IDS` overrides the lookup; when resolution fails the gate fails closed.

Guilds carry a tier — `NORMAL`, `PREMIUM`, or `HOME` (only one `HOME` at a time) — and the API enforces per-tier caps on stream watchers, keyword rules, and reaction-role panels (`-1` = unlimited, editable via `/bot limit`).

```text
/bot guild   list | info [guild_id] | tier <tier> [guild_id] | leave <guild_id> | sync
/bot profile activity <type> <text> [url] | about <text>
/bot limit   <tier> [watchers] [keywords] [panels]
/bot announce <message> [tier]     # DMs every guild owner
/bot stats                         # guilds, usage, tier distribution, uptime/ping
```

`profile activity` persists through `BotState` and is re-applied on every gateway Ready.

## Documentation

The site at [discord-bot.syntony666.com](https://discord-bot.syntony666.com) is the `@discord-bot/doc` workspace (VitePress). Preview with `npm run dev -w @discord-bot/doc`, build with `npm run build -w @discord-bot/doc`. Cloudflare Workers Builds deploys on pushes to `master` that touch `apps/doc/`; doc-only changes skip the VM deploy.

## Useful Resources

- [example.env](./example.env) — all environment variables with comments
- [Discord Developer Portal](https://discord.com/developers/applications) — bot token, application id, intents
- [Prisma](https://www.prisma.io/docs) · [Hono](https://hono.dev) · [RxJS](https://rxjs.dev) · [Twitch EventSub](https://dev.twitch.tv/docs/eventsub/)
