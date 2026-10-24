#!/usr/bin/env sh
set -e

# Husky is a dev-only tool; CI environments may not install it.
if command -v husky >/dev/null 2>&1; then
  husky
  npm run build -w @discord-bot/shared -w @discord-bot/discord-client
else
  echo "prepare: husky not found, skipping workspace bootstrap"
fi
