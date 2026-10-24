# Contributing

## Repository layout

- `apps/api` — Hono REST API and Prisma schema/migrations; owns the database
- `apps/bot` — Discord features, schedulers, health endpoints, API clients
- `apps/doc` — VitePress documentation site (`@discord-bot/doc`)
- `packages/shared` — DTOs, enums, constants, request helpers, logger
- `packages/discord-client` — Discord REST/gateway wrapper and the command/interaction runtime

## Setup

Node.js 22+, PostgreSQL.

```bash
npm install            # workspaces; `prepare` builds packages/*
cp example.env .env    # fill in values at repo root
npm run prisma:init    # push the schema (runs in apps/api)
npm run dev            # api + bot together
```

## Before pushing

CI enforces all of these on `master`, `release/**`, and PRs:

```bash
npm run build          # first — typecheck/tests resolve workspace dists
npm run format:check
npm run typecheck
npm test
npm run build -w @discord-bot/doc   # when touching apps/doc
```

## Conventions

- Prettier formats everything — run `npm run format`, never hand-format
- User-facing strings are Taiwan Traditional Chinese. Reuse established terms: 選單、範本、身分組、實況主、級別、關於我
- Error replies go through `ctx.error` / `ctx.require` (❌ ephemeral embeds); non-owner interaction clicks use the 🔒 restricted response; don't hand-build plain-text error replies
- Code comments in English only, and only where they add information
- Commit messages in English, under 50 words, conventional prefixes (`fix:`, `feat:`, `docs:`, `chore:`, `ci:`, `refactor:`, `style:`)
- Tests use `node --test`; files live at `apps/*/test/**/*.test.ts` and `packages/*/test/**/*.test.ts`. A behavior fix should include a regression test that fails without the fix

## Workflow

1. Branch off `master` (`fix/…`, `feat/…`, `docs/…`, `release/x.y.z`)
2. Keep commits small and single-concern; push and wait for CI green
3. Merge into `master` with `--no-ff` — real merge commits, no fast-forwards
4. Pushing `master` triggers CI → VM deploy for the bot. Pushes touching `apps/doc/` additionally trigger Cloudflare Workers Builds; doc-only changes skip the VM deploy
