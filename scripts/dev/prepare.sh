#!/usr/bin/env sh
set -e

# Bootstrap for local dev only: git hooks + prebuilt workspace deps.
# CI builds each workspace explicitly, so skip everything here.
if [ -n "${CI:-}" ]; then
  echo "prepare: CI detected, skipping workspace bootstrap"
  exit 0
fi

if command -v husky >/dev/null 2>&1; then
  husky
else
  echo "prepare: husky not found, skipping git hooks"
fi

npm run build -w @discord-bot/shared -w @discord-bot/discord-client
