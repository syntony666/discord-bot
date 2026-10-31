# AGENTS

Working agreement for coding agents in this repo. Contributor-facing rules live in [CONTRIBUTING.md](./CONTRIBUTING.md); this file covers how agents operate here.

## Protocol

- Plan before implementing non-trivial work; wait for explicit approval.
- Report after each step: files touched, what changed, verification output. Wait for review before continuing — including when a check fails.
- Use subagents to parallelize independent work (broad searches, disjoint edits).
- State-changing actions need their own explicit approval: git checkout/merge/rebase/commit/push/reset, dependency installs, deploys.
- Never claim a check passed unless it was actually run and observed.
- Commit messages in English, under 50 words.

## Repo notes

- `npm run build` must precede `typecheck`/`test` — they resolve workspace `dist/` outputs.
- `prepare` runs `scripts/prepare.sh` (husky + workspace prebuild) and no-ops under `CI`.
- Merge into `release/x.y.z` and then `master` with `--no-ff` only — no fast-forwards.
- Deploys: pushing `master` runs `ci.yml`, then `deploy.yml` (workflow_run, gated on ci success) SSHes to the VM and runs `./deploy.sh`. The script itself is a secret gist (`syntony666/4d2b911514492f945af95032dd2bd649`, "discord-bot 部署 script(systemd 版)") living on the VM — check the gist for actual steps, don't ask. It does: `git pull --ff-only` → skip if only `apps/doc/` changed → `npm ci` (filtered workspaces) → `npm run prisma:init` (**schema/db push happens here — new tables reach prod automatically**) → `npm run build` → systemd units `discord-bot-api` + `discord-bot` (`/opt/discord-bot`, user `discordbot`) → restart. Pushes touching `apps/doc/` also trigger Cloudflare Workers Builds.
- The docs subtree's history lives under `apps/doc/` — don't rewrite those commits when rebasing.
- `*.plan.md` files are gitignored local working notes — the active roadmap is `feature-plan.plan.md`.
