#!/usr/bin/env bash
# Entry point for every deploy (humans and Actions alike):
#   curl -fsSL https://sakiko.syntony666.com/install.sh | sudo bash -s -- [--version X.Y.Z] [--standalone]
# Ensures directories, fetches deploy.sh, decides which version to install,
# downloads and checksums the package, then hands off to deploy.sh.
# --standalone provisions a local PostgreSQL 16 first, unless .env already
# carries a DATABASE_URL.
set -euo pipefail

ROOT=/opt/sakiko-hoshino-bot
STATE_DIR="$ROOT/.deploy-state"
STATE_FILE="$STATE_DIR/last-deploy.json"
DEPLOY_SH_URL="${BOT_DEPLOY_SH_URL:-https://sakiko.syntony666.com/deploy.sh}"
RELEASE_API_URL="${BOT_RELEASE_API_URL:-https://api.github.com/repos/syntony666/discord-bot/releases/latest}"
RELEASE_BASE_URL="${BOT_RELEASE_BASE_URL:-https://github.com/syntony666/discord-bot/releases/download}"

die() { echo "install.sh: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing required tool: $1"; }

# Read one key from a JSON file (or stdin when the file is "-").
json_get() {
  python3 -c '
import json, sys
try:
    src = sys.stdin if sys.argv[1] == "-" else open(sys.argv[1])
    print(json.load(src).get(sys.argv[2], ""))
except Exception:
    print("")
' "$1" "$2"
}

[ "$(id -u)" = 0 ] || die "must run as root"
for t in curl tar sha256sum python3; do need "$t"; done

VERSION=""
STANDALONE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --standalone) STANDALONE=1; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done
[ -z "$VERSION" ] || [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "bad --version $VERSION"

# 1. directories (idempotent)
mkdir -p "$ROOT/releases" "$STATE_DIR" "$STATE_DIR/backups"
[ -f "$STATE_FILE" ] || printf '{}\n' > "$STATE_FILE"

# 2. latest deploy.sh -> /tmp, syntax-checked before use
DEPLOY_SH="$(mktemp /tmp/deploy.sh.XXXXXX)"
trap 'rm -f "$DEPLOY_SH"' EXIT
curl -fsSL "$DEPLOY_SH_URL" -o "$DEPLOY_SH" || die "cannot fetch deploy.sh from $DEPLOY_SH_URL"
bash -n "$DEPLOY_SH" || die "downloaded deploy.sh failed bash -n"
DEPLOY_SHA=$(sha256sum "$DEPLOY_SH" | cut -d' ' -f1)
python3 - "$STATE_FILE" "$DEPLOY_SHA" <<'PY'
import json, os, sys
p, sha = sys.argv[1], sys.argv[2]
st = json.load(open(p))
st["deployScriptSha256"] = sha
tmp = p + ".tmp"
json.dump(st, open(tmp, "w"))
os.replace(tmp, p)
PY

# 3. decide version
if [ -z "$VERSION" ]; then
  TAG=$(curl -fsSL "$RELEASE_API_URL" | json_get - tag_name) || TAG=""
  [ -n "$TAG" ] || die "cannot resolve latest release"
  VERSION="${TAG##*@}"
else
  TAG="@discord-bot/bot@$VERSION"
fi
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "could not resolve a version (got '$VERSION')"
echo "INSTALL version=$VERSION tag=$TAG"

# 4. download the small files, compare with state before pulling the tarball
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) PKG_ARCH=x64 ;;
  aarch64|arm64) PKG_ARCH=arm64 ;;
  *) die "unsupported arch $ARCH" ;;
esac
TARBALL="discord-bot-linux-$PKG_ARCH.tar.gz"
BASE="$RELEASE_BASE_URL/$TAG"

WORK="$(mktemp -d /tmp/bot-release.XXXXXX)"
trap 'rm -f "$DEPLOY_SH"; rm -rf "$WORK"' EXIT
curl -fsSL "$BASE/release.json" -o "$WORK/release.json" || die "cannot fetch release.json for $TAG"
curl -fsSL "$BASE/SHA256SUMS" -o "$WORK/SHA256SUMS" || die "cannot fetch SHA256SUMS for $TAG"

read -r REL_VERSION REL_COMMIT REL_SHA <<EOF
$(python3 - "$WORK/release.json" "$PKG_ARCH" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
arch = next((a for a in m["archives"] if a.get("arch") == sys.argv[2]), None)
print(m["version"], m["commit"], arch["sha256"] if arch else "-")
PY
)
EOF
[ "$REL_VERSION" = "$VERSION" ] || die "release.json version $REL_VERSION != tag version $VERSION"
[ -n "$REL_COMMIT" ] || die "release.json has no commit"
[ "$REL_SHA" != "-" ] || die "release.json has no archive for $PKG_ARCH"

CUR_BIN=""
[ -L "$ROOT/bin" ] && CUR_BIN=$(readlink -f "$ROOT/bin" || true)
CUR_VER=$(json_get "$STATE_FILE" version)
CUR_COMMIT=$(json_get "$STATE_FILE" commit)
CUR_PKG_SHA=""
if [ -n "$CUR_BIN" ] && [ -f "$CUR_BIN/.pkg-sha256" ]; then
  CUR_PKG_SHA=$(cat "$CUR_BIN/.pkg-sha256")
fi

if [ "$CUR_VER" = "$VERSION" ] && [ "$CUR_COMMIT" = "$REL_COMMIT" ] &&
  [ -n "$CUR_BIN" ] && [ -d "$CUR_BIN" ] && [ "$CUR_PKG_SHA" = "$REL_SHA" ]; then
  echo "install.sh: $VERSION ($REL_COMMIT) already present at $CUR_BIN — skipping tarball download"
  NEED_TARBALL=0
else
  NEED_TARBALL=1
  curl -fsSL "$BASE/$TARBALL" -o "$WORK/$TARBALL" || die "cannot fetch $TARBALL for $TAG"
  EXPECTED=$(grep " $TARBALL\$" "$WORK/SHA256SUMS" | cut -d' ' -f1) \
    || die "SHA256SUMS has no entry for $TARBALL"
  ACTUAL=$(sha256sum "$WORK/$TARBALL" | cut -d' ' -f1)
  [ "$EXPECTED" = "$ACTUAL" ] || die "checksum mismatch for $TARBALL"
  [ "$REL_SHA" = "$ACTUAL" ] || die "release.json sha for $TARBALL does not match"
fi

echo "BOOTSTRAP sha=$DEPLOY_SHA"

# --standalone: provision a local PostgreSQL 16 role+database and write
# DATABASE_URL into $ROOT/.env. Complete no-op when .env already has one.
# The generated password only ever reaches .env via stdin pipes — never
# argv, output, or logs.
standalone_db() {
  local env_file="$ROOT/.env" db_pass
  if [ -f "$env_file" ] && grep -q '^DATABASE_URL=' "$env_file"; then
    echo "install.sh: --standalone: $env_file already has DATABASE_URL — leaving it alone"
    return 0
  fi

  echo "install.sh: --standalone: provisioning local PostgreSQL 16"
  if ! command -v psql >/dev/null 2>&1; then
    apt-get update -qq
    apt-cache show postgresql-16 >/dev/null 2>&1 \
      || die "postgresql-16 is not in the configured apt repos — provision a database yourself and put DATABASE_URL in $env_file"
    DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-16 >/dev/null \
      || die "cannot install postgresql-16 — provision a database yourself and put DATABASE_URL in $env_file"
  fi
  command -v runuser >/dev/null 2>&1 || die "missing required tool: runuser"

  if command -v pg_ctlcluster >/dev/null 2>&1; then
    pg_ctlcluster 16 main start >/dev/null 2>&1 || true
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now postgresql >/dev/null 2>&1 || true
  fi
  runuser -u postgres -- psql -tAc 'select 1' >/dev/null 2>&1 \
    || die "PostgreSQL 16 is not running — start the cluster and retry"

  db_pass=$(python3 -c 'import secrets;print(secrets.token_hex(24))')
  {
    cat <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'discord_bot') THEN
    CREATE ROLE discord_bot LOGIN;
  END IF;
END
$$;
SQL
    printf "ALTER ROLE discord_bot WITH PASSWORD '%s';\n" "$db_pass"
  } | runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 >/dev/null \
    || die "cannot provision role discord_bot"
  if ! runuser -u postgres -- psql -tAc "select 1 from pg_database where datname = 'discord_bot'" | grep -q 1; then
    echo 'CREATE DATABASE discord_bot OWNER discord_bot;' \
      | runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 >/dev/null \
      || die "cannot create database discord_bot"
  fi

  touch "$env_file"
  printf 'DATABASE_URL=postgresql://discord_bot:%s@localhost:5432/discord_bot\n' "$db_pass" >> "$env_file"
  chmod 600 "$env_file"
  if id discordbot >/dev/null 2>&1; then
    chown discordbot:discordbot "$env_file"
  fi
  unset db_pass
  echo "install.sh: --standalone: local database ready; DATABASE_URL written to $env_file"
}
if [ "$STANDALONE" = 1 ]; then standalone_db; fi

# 5. hand off to deploy.sh; its DEPLOY line must appear or we treat it as a failure
DEPLOY_OUT="$(mktemp /tmp/deploy-out.XXXXXX)"
trap 'rm -f "$DEPLOY_SH" "$DEPLOY_OUT"; rm -rf "$WORK"' EXIT
set +e
if [ "$NEED_TARBALL" = 1 ]; then
  bash "$DEPLOY_SH" --version "$VERSION" --dir "$WORK" 2>&1 | tee "$DEPLOY_OUT"
else
  bash "$DEPLOY_SH" --version "$VERSION" 2>&1 | tee "$DEPLOY_OUT"
fi
RC=${PIPESTATUS[0]}
set -e
[ $RC -eq 0 ] || exit $RC
grep -q '^DEPLOY version=' "$DEPLOY_OUT" || die "deploy.sh did not report a DEPLOY line — aborting"
echo "install.sh: done"
