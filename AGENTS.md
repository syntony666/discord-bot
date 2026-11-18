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
- Releases run through changesets: feature branches carry `.changeset/*.md` (`npx changeset`); only `@discord-bot/bot` is versioned — all other workspaces are ignored. The maintainer runs **Start Release** (`release-pr.yml`) on `master` with `release/x.y.z`; `scripts/release/start-release.sh` validates the source branch and pending changesets, runs `changeset version`, and opens `changeset-release/x.y.z` → `master`. Merging that PR bumps `apps/bot/package.json`, writes `apps/bot/CHANGELOG.md`, and triggers `release.yml`: it repacks linux-arm64/x64 tarballs on the merge commit (no tests — CI already ran), tags `@discord-bot/bot@x.y.z`, publishes the GitHub release, then `workflow_call`s `deploy-vm.yml` — the version is decided by the pending changesets, not when the release branch is cut.
- Direct VM access: `ssh ubuntu@$VM_HOST` (Oracle Cloud `oracle-vm-1`, key auth; the VM host is kept out of the repo — ask for it or use the `VM_HOST` secret).
- Deploys: `deploy-vm.yml` is `workflow_call`-only. It SSHes to the VM (secrets `VM_HOST`/`VM_USER`/`VM_SSH_KEY`, host key pinned in `scripts/known_hosts`, `StrictHostKeyChecking=yes` — never `ssh-keyscan`/`accept-new`) and runs `curl -fsSL https://sakiko.syntony666.com/install.sh | sudo bash`. `scripts/install.sh` discovers the latest release, verifies metadata/commit/SHA256/arch, then `scripts/deploy.sh` does DB plan/verify/apply with a pre-apply `pg_dump` backup, an atomic `releases/<version>-<sha>` + `bin` symlink flip, health check, and rollback on failure. The unit text embedded in `deploy.sh` is generated — edit `scripts/units/*.conf` and regenerate with `scripts/sync-units.js`; tests run `--check` against drift.
- VM layout: `/opt/sakiko-hoshino-bot/` (`releases/`, `bin`, `.env`, `backups/`); Node installs side-by-side at `/opt/node-<version>/` (currently 24.15.0) — never touch the system `node`. Services `discord-bot-api` + `discord-bot` run as `discordbot` under `discord-bot.target` (`API_PORT` 3001, `HEALTH_PORT` 3000 defaults). The old mutable checkout at `/opt/discord-bot` and the gist `deploy.sh` are retired by the 5.3.1 cutover.
- The docs subtree's history lives under `apps/doc/` — don't rewrite those commits when rebasing.
- `*.plan.md` files are gitignored local working notes — the active roadmap is `feature-plan.plan.md`.
