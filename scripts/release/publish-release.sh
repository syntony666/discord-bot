#!/usr/bin/env bash
# Publishes the GitHub Release for a merged version bump (plan §10).
# Invoked by .github/workflows/release.yml's publish job on master.
#
# Required env:
#   RELEASE_TAG       e.g. @discord-bot/bot@5.3.1
#   RELEASE_VERSION   e.g. 5.3.1
#   RELEASE_SHA       merge commit the tag must point at
#   ARTIFACT_DIR      dir holding the pipeline outputs:
#                       discord-bot-linux-arm64.tar.gz
#                       discord-bot-linux-x64.tar.gz
#                       release.json
#                       SHA256SUMS
#   GH_TOKEN          for the gh CLI
#
# Local testing: `gh` resolves through PATH and git tags through `origin`,
# so scripts/test/publish-release.test.js can point both at fakes.

set -euo pipefail

err() { printf '::error::%s\n' "$*" >&2; exit 1; }

for var in RELEASE_TAG RELEASE_VERSION RELEASE_SHA ARTIFACT_DIR; do
  [[ -n "${!var:-}" ]] || err "$var is required"
done

EXPECTED=(
  'discord-bot-linux-arm64.tar.gz'
  'discord-bot-linux-x64.tar.gz'
  'release.json'
  'SHA256SUMS'
)

for f in "${EXPECTED[@]}"; do
  [[ -f "$ARTIFACT_DIR/$f" ]] || err "missing artifact: $ARTIFACT_DIR/$f"
done

# --- 1. tag: must point at the merge commit ------------------------------
# An annotated tag lists its tag-object sha; peel it to the commit via ^{}.
tag_sha="$(git ls-remote --tags origin "refs/tags/${RELEASE_TAG}^{}" | head -1 | cut -f1)"
[[ -n "$tag_sha" ]] || tag_sha="$(git ls-remote --tags origin "refs/tags/$RELEASE_TAG" | head -1 | cut -f1)"
if [[ -n "$tag_sha" && "$tag_sha" != "$RELEASE_SHA" ]]; then
  err "$RELEASE_TAG already points at $tag_sha, not $RELEASE_SHA; a tag is never moved."
fi
if [[ -z "$tag_sha" ]]; then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git tag -a "$RELEASE_TAG" -m "$RELEASE_TAG" "$RELEASE_SHA"
  git push -q origin "refs/tags/$RELEASE_TAG"
  echo "tagged $RELEASE_TAG at $RELEASE_SHA"
fi

# --- 2. release: view, or create a draft ----------------------------------
release_view() {
  gh release view "$RELEASE_TAG" --json isDraft,assets 2>&1 || true
}

view="$(release_view)"
if [[ "$view" != \{* ]]; then
  if grep -qi 'not found' <<< "$view"; then
    notes="$(awk -v v="$RELEASE_VERSION" \
      '$0 == "## " v {f=1; next} /^## / {f=0} f' apps/bot/CHANGELOG.md)"
    gh release create "$RELEASE_TAG" --draft \
      --title "$RELEASE_TAG" --notes "${notes:-Release $RELEASE_TAG}" >/dev/null
    echo "created draft release $RELEASE_TAG"
    is_draft="true"
    assets=""
  else
    err "could not read release state: $view"
  fi
else
  is_draft="$(node -p 'JSON.parse(process.argv[1]).isDraft' "$view")"
  assets="$(node -p 'JSON.parse(process.argv[1]).assets.map((a) => a.name).join("\n")' "$view")"
fi

# --- 3. assets: reuse matching, fill missing, refuse mismatched -----------
to_upload=()
for f in "${EXPECTED[@]}"; do
  if grep -qxF "$f" <<< "$assets"; then
    tmp="$(mktemp)"
    if ! gh release download "$RELEASE_TAG" -p "$f" -D "$(dirname "$tmp")" -O "$tmp" 2>/dev/null; then
      err "could not download existing asset $f to verify it; refusing to guess."
    fi
    if ! cmp -s "$tmp" "$ARTIFACT_DIR/$f"; then
      err "asset $f exists on the release with different content; refusing to overwrite."
    fi
    rm -f "$tmp"
    echo "reusing published asset $f"
  else
    to_upload+=("$f")
  fi
done

if [[ "$is_draft" != "true" && "${#to_upload[@]}" -gt 0 ]]; then
  err "release $RELEASE_TAG is already published but missing: ${to_upload[*]}; refusing to modify it."
fi

for f in "${to_upload[@]}"; do
  gh release upload "$RELEASE_TAG" "$ARTIFACT_DIR/$f" >/dev/null
  echo "uploaded $f"
done

# --- 4. publish ------------------------------------------------------------
if [[ "$is_draft" == "true" ]]; then
  gh release edit "$RELEASE_TAG" --draft=false >/dev/null
  echo "published $RELEASE_TAG"
fi
