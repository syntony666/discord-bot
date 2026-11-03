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
- Code comments in English only, and only where they add information
- Commit messages in English, under 50 words, conventional prefixes (`fix:`, `feat:`, `docs:`, `chore:`, `ci:`, `refactor:`, `style:`)

## Testing

- `node --test` on plain `.test.ts` files (Node 26 strips types natively — not `.mts`); files live at `apps/*/test/**/*.test.ts` and `packages/*/test/**/*.test.ts`
- Tests only resolve relative paths and workspace packages — the `@core`/`@features` aliases don't resolve without a hook
- A behavior fix should include a regression test that fails without the fix
- An interaction E2E harness survives on the `test/interaction-harness` branch if ever needed

## Reply style

User-facing strings are Taiwan Traditional Chinese. Reuse established terms: 身分組選單、反應身分組、範本、身分組、實況主、級別、關於我、新增、使用者名稱、線上、運作、選項、頁尾、發送.

Bot replies — copy and embeds follow settled rules; match them instead of inventing new formats:

- Titles state the outcome in plain text (`關鍵字已新增`) — never a generic `ctx.success` ✅ title. Emoji only where the semantics call for it: ✅❌ binary state, ⚠️ confirm, 🔒 permission, 🔴 live
- `：` is full-width; `()` and `...` stay half-width. Names/values in `**bold**` with half-width spaces — never 「」 or italics. Empty/unset renders as `—`. Write `機器人`, never `Bot`. Reference commands with `commandMention`, not literal `/cmd` text. Tier values stay English (`NORMAL`/`PREMIUM`/`HOME`, icons ⚪🟣🟡); "Tier" is written `級別`
- Colors: `SUCCESS` (state changed), `INFO` (queries/no change), `WARNING` (destructive success), `ERROR` + `❌` title (failures), `confirm` orange + `⚠️` (awaiting confirmation), `MEMBER_JOIN`/`MEMBER_LEAVE` for member events, `StreamLiveColors[platform]` for live alerts
- Visibility: errors (`ctx.error`/`ctx.require`), confirm prompts, and cancel/timeout flows are ephemeral — never hand-build plain-text error replies. Operation results are public: `ctx.announce*` follow-ups sign the operator via the embed `author` field. `h.component` routed buttons expire after 5 minutes; a click on an expired button clears it and answers ephemerally. Non-owner clicks use the 🔒 restricted response

`apps/doc` copy follows its own zh-TW rules (different from bot replies): full-width punctuation (（）「」，、；：), a half-width space between Chinese and Latin (`實況主 ID`), and terms matching the bot's command copy.

## Platform notes

Interactions:

- `ctx.modal` must be the interaction's first response; a button → dialog flow goes through `h.component` because the click is a new interaction
- `h.component(pattern, fn, { sameUser: true })` restricts a component to the original user. Pattern `{param}` segments match `[^:]+` — values can't contain `:` — and `custom_id` caps at 100 chars
- Modal inputs prefill via `value` (max 4000). Closing a modal fires no callback — it resolves `null` after `timeoutMs` (5 min default). After a modal submit only `ctx.followUp` remains (the ack consumed the response; the webhook token lives 15 min). There is no clipboard API — "copy" is a prefilled modal for manual select-all
- Component/modal dispatch: `kit:` prefixed ids are consumed by the session layer first, then `h.component` patterns

Discord:

- Global commands have no per-user visibility; `default_member_permissions` only takes a permission bitfield and `"0"` ≈ admin-only. The client-side command list is cached — after a sync, users may need to reopen the app
- Bulk delete only covers messages ≤ 14 days old; DMs require `openDm` to get a channel id
- Crossposting: messages with links need ~7s for embeds to materialize or you publish a bare link; honor `retry_after`

Codebase:

- `packages/discord-client` changes need a rebuild — the bot consumes its `dist/` and typecheck can miss new exports otherwise
- API semantics: an absent optional field means "don't update"; `orNull(request)` turns a 404 into `null` and the feature decides what "not found" means. For confirms that display accurate numbers, fetch the data before prompting
- Tier formatting helpers live in `features/guild/guild.tier.ts` (`TIER_ICON`/`tierName`/`formatUsage`) — don't re-implement them

## Workflow

Work branches off the current `release/x.y.z` branch, never directly off `master`:

1. Create or reuse the release branch: `release/x.y.z` — the name declares intent; the shipped version is computed by changesets at release time, not by hand
2. Branch off it (`fix/…`, `feat/…`, `docs/…`). Changes that belong in the changelog carry a changeset file — run `npx changeset`, pick the bump level (patch/minor/major), describe the change. Only `@discord-bot/bot` is versioned; all other workspaces are changeset-ignored
3. Push and wait for CI green, then merge into `release/x.y.z` with `--no-ff` — real merge commits, no fast-forwards
4. When the release is ready, merge `release/x.y.z` into `master` with `--no-ff` and push — changesets/action opens (or updates) a `chore: release` PR accumulating every pending changeset
5. Merge the `chore: release` PR to ship: it bumps `apps/bot/package.json`, writes `apps/bot/CHANGELOG.md`, tags `@discord-bot/bot@x.y.z`, and creates the GitHub release. Nothing is versioned until that PR merges
6. Pushing `master` triggers CI → VM deploy for the bot. Pushes touching `apps/doc/` additionally trigger Cloudflare Workers Builds; doc-only changes skip the VM deploy

## Change discipline

- **Small, reviewable increments.** One commit per concern — split anything that can't be reviewed at a glance rather than landing one big diff
- **Assess the blast radius first.** Before refactoring or touching shared code, trace what depends on it and say what the change can break (API contract, interaction flows, deployment) before editing
- **No fake branches.** A branch that fast-forwards straight back leaves no history boundary — always merge with `--no-ff` so the change's edges are visible
