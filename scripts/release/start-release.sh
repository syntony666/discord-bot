#!/usr/bin/env bash
# Prepares a release PR for release/x.y.z (plan §4.2/§4.3).
# Invoked by .github/workflows/release-pr.yml (Start Release) on master.
# Testable locally: git talks to whatever `origin` the checkout has and `gh`
# resolves through PATH, so scripts/test/start-release.test.js can point both
# at fakes. PREPARE_CMD replaces the real changeset pipeline in tests.

set -euo pipefail

err() { printf '::error::%s\n' "$*" >&2; exit 1; }
warn() { printf '::warning::%s\n' "$*" >&2; }

raw="${RELEASE_BRANCH:?RELEASE_BRANCH is required (x.y.z or release/x.y.z)}"
version="${raw#release/}"
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] \
  || err "release_branch must be x.y.z or release/x.y.z."

SOURCE="release/$version"
TARGET="changeset-release/$version"
BOT_TAG="@discord-bot/bot@$version"
export VERSION="$version"

git fetch -q origin "refs/heads/master:refs/remotes/origin/master"

# A published version is never re-released.
[[ -z "$(git ls-remote --tags origin "refs/tags/$BOT_TAG")" ]] \
  || err "$BOT_TAG already exists; a published version is never re-released."

pr_field() {
  gh pr list --head "$TARGET" --base master --state all \
    --json "$1" --jq ".[0].$1 // empty"
}

state="$(pr_field state)"
url="$(pr_field url)"

[[ "$state" != MERGED ]] \
  || err "This release PR is already merged; use a new release branch."

# --- resolve the source branch -------------------------------------------
existing="$(git ls-remote --heads origin "refs/heads/$TARGET")"
existing_sha="${existing%%[[:space:]]*}"

source=""
if [[ -n "$(git ls-remote --heads origin "refs/heads/$SOURCE")" ]]; then
  git fetch -q origin "refs/heads/$SOURCE:refs/remotes/origin/$SOURCE"
  source="$(git rev-parse "refs/remotes/origin/$SOURCE")"
  git merge-base --is-ancestor origin/master "$source" \
    || err "Sync the latest master into $SOURCE before starting."
elif [[ "$state" == OPEN && -n "$existing" ]]; then
  echo "$SOURCE is already deleted; reusing the existing release PR."
else
  err "$SOURCE does not exist; create it from master before starting."
fi

pr_body() {
  gh pr list --head "$TARGET" --base master --state all \
    --json body --jq '.[0].body // empty'
}
rec_prepared_of() { sed -n 's/^Prepared: \([0-9a-f]\{40\}\).*/\1/p' | head -1; }
rec_source_of() { sed -n 's/^Source: .* at \([0-9a-f]\{40\}\).*/\1/p' | head -1; }

# --- closed PR: re-prepare only when the prepared commit is untouched ------
if [[ "$state" == CLOSED ]]; then
  [[ -n "$source" ]] \
    || err "$SOURCE is gone; cannot re-prepare a closed release PR."
  if [[ -n "$existing" ]]; then
    recorded="$(pr_body | rec_prepared_of)"
    [[ -n "$recorded" && "$existing_sha" == "$recorded" ]] \
      || err "The prepared branch changed after the PR closed; refusing to overwrite."
    git push -q origin --delete "refs/heads/$TARGET"
    existing=""
    existing_sha=""
  fi
  state=""
  url=""
fi

# --- reuse an open PR only when nothing moved ------------------------------
prepared=""
if [[ -n "$existing" ]]; then
  git fetch -q origin "refs/heads/$TARGET"
  git switch -q --detach FETCH_HEAD
  body="$(pr_body)"
  rec_source="$(rec_source_of <<< "$body")"
  rec_prepared="$(rec_prepared_of <<< "$body")"
  [[ -n "$rec_prepared" && "$existing_sha" == "$rec_prepared" ]] \
    || err "The prepared branch changed after preparation; existing release commits are never overwritten."
  if [[ -n "$source" && "$source" != "$rec_source" ]]; then
    err "$SOURCE moved after preparation; close the stale PR and start over."
  fi
  prepared="$existing_sha"
  echo "Reusing the existing release PR at $url"
else
  pending="$(git ls-tree -r --name-only "$source" -- .changeset/ \
    | grep '\.md$' | grep -vc 'README\.md$' || true)"
  [[ "$pending" -gt 0 ]] \
    || err "$SOURCE has no pending changesets; add at least one before starting a release."

  git switch -q -C "$TARGET" "$source"

  if [[ -n "${PREPARE_CMD:-}" ]]; then
    bash -c "$PREPARE_CMD"
  else
    npm ci
    plan_file="$(mktemp)"
    npx --no-install changeset status --output "$plan_file"
    RELEASE_PLAN="$plan_file" node --input-type=module <<'NODE'
      import { readFileSync } from 'node:fs';
      const { releases } = JSON.parse(readFileSync(process.env.RELEASE_PLAN, 'utf8'));
      const got = releases.map((r) => `${r.name}@${r.newVersion}`).join(', ') || 'nothing';
      if (
        releases.length !== 1 ||
        releases[0].name !== '@discord-bot/bot' ||
        releases[0].newVersion !== process.env.VERSION
      ) {
        console.log(
          `::error::pending changesets produce ${got}, expected @discord-bot/bot@${process.env.VERSION}`
        );
        console.log('未執行版本更新，未建立發布 PR。');
        process.exit(1);
      }
NODE
    rm -f "$plan_file"
    npm run version:packages
    npm install --package-lock-only --ignore-scripts
  fi

  node --input-type=module <<'NODE'
    import assert from 'node:assert/strict';
    import { readFileSync, readdirSync } from 'node:fs';
    const v = process.env.VERSION;
    const esc = v.replace(/\./g, '\\.');
    const pkg = JSON.parse(readFileSync('apps/bot/package.json', 'utf8'));
    assert.equal(pkg.version, v, 'apps/bot/package.json must carry the target version');
    assert.match(
      readFileSync('apps/bot/CHANGELOG.md', 'utf8'),
      new RegExp(`^## ${esc}\\b`, 'm'),
      `apps/bot/CHANGELOG.md has no section for ${v}`
    );
    assert.match(
      readFileSync('apps/doc/.vitepress/version.mts', 'utf8'),
      new RegExp(`BOT_VERSION = '${esc}'`),
      'docs footer version.mts was not stamped'
    );
    const pending = readdirSync('.changeset').filter(
      (p) => p.endsWith('.md') && p !== 'README.md'
    );
    assert.equal(pending.length, 0, `unconsumed changesets: ${pending.join(', ')}`);
NODE

  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add -A
  git commit -qm "chore: release $version"
  git push -q origin "HEAD:refs/heads/$TARGET"
  prepared="$(git rev-parse HEAD)"
fi

if [[ "$state" == OPEN ]]; then
  pr_link="$url"
else
  body="$(printf 'Source: %s at %s\nPrepared: %s\n\nReview versions, changelogs, and the docs preview, then Approve and Merge manually after Fixture assertions passes. Auto-merge is not enabled.' \
    "$SOURCE" "${source:-deleted}" "$prepared")"
  pr_link="$(gh pr create --base master --head "$TARGET" \
    --title "chore: release $version" --body "$body")"
fi

printf '## Release prepared\n\n[Review PR](%s)\n\nApprove and Merge manually after Fixture assertions passes.\n' \
  "$pr_link" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

if [[ -n "$source" ]]; then
  git push --force-with-lease="refs/heads/$SOURCE:$source" \
    origin ":refs/heads/$SOURCE" \
    || warn "Could not delete $SOURCE; remove it manually."
fi
