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
- Deploys: pushing `master` runs CI then `deploy.sh` on the VM (script lives in a gist, fetched live). Pushes touching `apps/doc/` also trigger Cloudflare Workers Builds; doc-only pushes skip the VM deploy via path diff.
- The docs subtree's history lives under `apps/doc/` — don't rewrite those commits when rebasing.
