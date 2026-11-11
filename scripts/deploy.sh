#!/usr/bin/env bash
# deploy.sh — deploys one verified release package on this host.
# Fetched fresh by install.sh for every run; never left resident on the VM.
#   deploy.sh --version X.Y.Z --dir <dir with tarball+release.json+SHA256SUMS>
#   deploy.sh --version X.Y.Z            (health-verify the current install)
set -euo pipefail

ROOT=/opt/sakiko-hoshino-bot
STATE_DIR="$ROOT/.deploy-state"
BACKUP_DIR="$STATE_DIR/backups"
STATE_FILE="$STATE_DIR/last-deploy.json"
LOCK_FILE="$STATE_DIR/deploy.lock"
ENV_FILE="$ROOT/.env"
NODE_MAJOR=24
NODE_INSTALL_VERSION="24.15.0"
API_UNIT=discord-bot-api
BOT_UNIT=discord-bot
API_PORT_DEFAULT=3001
HEALTH_PORT_DEFAULT=3000

die() { echo "deploy.sh: $*" >&2; exit 1; }
say() { echo "deploy.sh: $*"; }

VERSION=""; PKGDIR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --dir) PKGDIR="${2:-}"; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[ -n "$VERSION" ] || die "missing --version"
[ "$(id -u)" = 0 ] || die "must run as root"
cd /

# ---------- ensure_host: check first, install only what is missing ----------
ensure_prereqs() {
  local missing=()
  command -v python3 >/dev/null || missing+=(python3)
  command -v tar >/dev/null || missing+=(tar)
  command -v flock >/dev/null || missing+=(util-linux)
  command -v systemd-run >/dev/null || die "systemd-run missing — is this a systemd host?"
  command -v curl >/dev/null || missing+=(curl)
  if ! command -v pg_dump >/dev/null || ! command -v pg_restore >/dev/null; then
    if apt-cache show postgresql-client-16 >/dev/null 2>&1; then
      missing+=(postgresql-client-16)
    else
      missing+=(postgresql-client)
    fi
  fi

  if [ "${#missing[@]}" -gt 0 ]; then
    say "installing missing tools: ${missing[*]}"
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}" >/dev/null \
      || die "cannot install: ${missing[*]}"
  fi

  if ! command -v node >/dev/null; then
    say "installing Node.js $NODE_INSTALL_VERSION"
    local arch t
    case "$(uname -m)" in
      x86_64) arch=x64 ;;
      aarch64|arm64) arch=arm64 ;;
      *) die "unsupported arch" ;;
    esac
    t=$(mktemp -d)
    curl -fsSL "https://nodejs.org/dist/v${NODE_INSTALL_VERSION}/node-v${NODE_INSTALL_VERSION}-linux-${arch}.tar.xz" \
      -o "$t/node.tar.xz" || die "cannot download Node.js"
    mkdir -p "/opt/node-$NODE_INSTALL_VERSION"
    tar -xJf "$t/node.tar.xz" -C "/opt/node-$NODE_INSTALL_VERSION" --strip-components=1
    ln -sfn "/opt/node-$NODE_INSTALL_VERSION/bin/node" /usr/bin/node
    rm -rf "$t"
  fi
  local major
  major=$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')
  [ "$major" = "$NODE_MAJOR" ] || die "node is $(node --version), need ${NODE_MAJOR}.x — not touching it"

  for t in python3 tar flock systemd-run curl pg_dump pg_restore node; do
    command -v "$t" >/dev/null || die "$t still missing after install"
  done
}

ensure_user() {
  id discordbot >/dev/null 2>&1 || {
    say "creating service user discordbot"
    useradd --system --no-create-home --shell /usr/sbin/nologin discordbot
  }
}

# unit templates — heredoc bodies are generated from scripts/*.conf by
# scripts/deploy-sync-units.mjs (# @embed markers); do not edit them by hand
unit_body_api() {
  # @embed deploy-unit-api.conf
  cat <<'EOF'
[Unit]
Description=discord-bot API
After=network-online.target
PartOf=discord-bot.target

[Service]
Type=simple
User=discordbot
Group=discordbot
WorkingDirectory=/opt/sakiko-hoshino-bot/bin
EnvironmentFile=/opt/sakiko-hoshino-bot/.env
ExecStart=/usr/bin/node apps/api/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=discord-bot.target
EOF
}
unit_body_bot() {
  # @embed deploy-unit-bot.conf
  cat <<'EOF'
[Unit]
Description=discord-bot
After=network-online.target discord-bot-api.service
PartOf=discord-bot.target

[Service]
Type=simple
User=discordbot
Group=discordbot
WorkingDirectory=/opt/sakiko-hoshino-bot/bin
EnvironmentFile=/opt/sakiko-hoshino-bot/.env
ExecStart=/usr/bin/node apps/bot/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=discord-bot.target
EOF
}
dropin_body() {
  local entry=$1
  # @embed deploy-unit-dropin.conf
  cat <<'EOF' | sed "s|__ENTRY__|$entry|"
[Service]
WorkingDirectory=/opt/sakiko-hoshino-bot/bin
EnvironmentFile=/opt/sakiko-hoshino-bot/.env
ExecStart=
ExecStart=/usr/bin/node __ENTRY__
EOF
}

ensure_units() {
  local changed=0 unit f want entry d wantd
  for unit in $API_UNIT $BOT_UNIT; do
    f="/etc/systemd/system/$unit.service"
    if [ ! -f "$f" ]; then
      say "creating $unit.service"
      if [ "$unit" = "$API_UNIT" ]; then unit_body_api > "$f"; else unit_body_bot > "$f"; fi
      changed=1
    else
      # unit already exists (current VM): drop-in repoints it at the new layout
      entry=$([ "$unit" = "$API_UNIT" ] && echo apps/api/dist/index.js || echo apps/bot/dist/index.js)
      d="/etc/systemd/system/$unit.service.d/release.conf"
      wantd=$(dropin_body "$entry")
      if [ ! -f "$d" ] || [ "$(cat "$d")" != "$wantd" ]; then
        say "installing drop-in for $unit"
        mkdir -p "$(dirname "$d")"
        printf '%s\n' "$wantd" > "$d"
        changed=1
      fi
    fi
  done
  [ "$changed" = 1 ] && systemctl daemon-reload
  systemctl enable "$API_UNIT" "$BOT_UNIT" >/dev/null 2>&1 || true
  return 0
}

# ---------- .env (names only; values never echo, never on argv) ----------
read_env_var() {
  [ -f "$ENV_FILE" ] || return 0
  awk -F= -v k="$1" '$1==k{sub(/^[^=]*=/,""); gsub(/^["'"'"']|["'"'"']$/,""); print; exit}' "$ENV_FILE"
}
require_env_file() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE missing — put the environment file in place first; nothing was changed"
  local v
  for v in DISCORD_TOKEN DISCORD_APP_ID DATABASE_URL; do
    grep -q "^$v=" "$ENV_FILE" || die "$ENV_FILE is missing $v"
  done
}
api_port() { local p; p=$(read_env_var API_PORT); echo "${p:-$API_PORT_DEFAULT}"; }
health_port() { local p; p=$(read_env_var HEALTH_PORT); echo "${p:-$HEALTH_PORT_DEFAULT}"; }

# export PG* so psql/pg_dump/pg_restore connect without the URL on argv
export_pg_env() {
  local kv
  while IFS='=' read -r k v; do
    [ -n "$k" ] && export "$k=$v"
  done < <(python3 -c '
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
print("PGHOST=" + (u.hostname or "localhost"))
print("PGPORT=" + str(u.port or 5432))
print("PGUSER=" + urllib.parse.unquote(u.username or ""))
print("PGPASSWORD=" + urllib.parse.unquote(u.password or ""))
print("PGDATABASE=" + urllib.parse.unquote((u.path or "/").lstrip("/")))
' "$(read_env_var DATABASE_URL)")
}

db_ok() { psql -tAc 'select 1' >/dev/null 2>&1; }

# ---------- deployment ----------
main() {
  ensure_prereqs
  ensure_user
  ensure_units
  require_env_file
  export_pg_env

  local dbver
  dbver=$(psql -tAc 'show server_version' 2>/dev/null) || die "DATABASE_URL unreachable — stopping, services untouched"
  case "$dbver" in
    16.*) ;;
    *) die "database is PostgreSQL $dbver, expected 16.x" ;;
  esac

  mkdir -p "$ROOT/releases" "$STATE_DIR" "$BACKUP_DIR"
  [ -f "$STATE_FILE" ] || printf '{}\n' > "$STATE_FILE"
  touch "$LOCK_FILE"
  exec 200>"$LOCK_FILE"
  flock -n 200 || die "another deploy is running"

  PREV_BIN=""
  [ -L "$ROOT/bin" ] && PREV_BIN=$(readlink -f "$ROOT/bin" || true)

  if [ -z "$PKGDIR" ]; then
    local cur_ver
    cur_ver=$(state_get version)
    if [ "$cur_ver" = "$VERSION" ] && [ -n "$PREV_BIN" ] && [ -d "$PREV_BIN" ]; then
      echo "DEPLOY version=$VERSION commit=$(state_get commit)"
      if verify_health; then
        say "$VERSION already deployed and healthy"
        exit 0
      fi
      die "recorded version $VERSION is not healthy — manual check needed"
    fi
    die "--dir required when installing a new version"
  fi

  verify_package
  echo "DEPLOY version=$VERSION commit=$REL_COMMIT"

  DESTDIR="$ROOT/releases/$VERSION-${REL_COMMIT:0:12}"
  extract_package

  # db plan runs BEFORE any downtime — rejection leaves prod untouched
  mkdir -p "$STATE_DIR/plan"
  chown discordbot:discordbot "$STATE_DIR/plan"
  run_release_db plan --out "$STATE_DIR/plan" \
    || die "db plan rejected — stopping before any downtime"

  # ---------- stop window ----------
  state_set prev_bin "${PREV_BIN:-none}"
  DUMP="$BACKUP_DIR/pre-$VERSION-$(date +%Y%m%d%H%M%S).dump"
  if ! deploy_window; then
    restore "deploy failed inside stop window"
    exit 1
  fi

  state_write_success
  cleanup_old
  say "committed $VERSION-${REL_COMMIT:0:12}"
}

verify_package() {
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    *) die "unsupported arch" ;;
  esac
  TARBALL="$PKGDIR/discord-bot-linux-$ARCH.tar.gz"
  [ -f "$TARBALL" ] || die "missing tarball"
  [ -f "$PKGDIR/release.json" ] || die "missing release.json"
  [ -f "$PKGDIR/SHA256SUMS" ] || die "missing SHA256SUMS"

  local expect actual
  expect=$(grep " discord-bot-linux-$ARCH\.tar\.gz\$" "$PKGDIR/SHA256SUMS" | awk '{print $1}')
  actual=$(sha256sum "$TARBALL" | cut -d' ' -f1)
  [ -n "$expect" ] || die "SHA256SUMS has no entry for the tarball"
  [ "$expect" = "$actual" ] || die "tarball checksum mismatch"
  TARBALL_SHA=$actual

  REL_COMMIT=$(python3 - "$PKGDIR/release.json" "$VERSION" "$ARCH" "$actual" <<'PY'
import json, sys
m, version, arch, sha = json.load(open(sys.argv[1])), *sys.argv[2:]
assert m["version"] == version, f'release.json version {m["version"]} != {version}'
a = next((x for x in m["archives"] if x["arch"] == arch), None)
assert a, f"no {arch} archive in release.json"
assert a["sha256"] == sha, "archive sha mismatch"
print(m["commit"])
PY
) || die "release.json verification failed"

  local tmp
  tmp=$(mktemp -d)
  tar -xzf "$TARBALL" -C "$tmp" ./build.json 2>/dev/null || tar -xzf "$TARBALL" -C "$tmp" build.json
  python3 - "$tmp/build.json" "$VERSION" "$REL_COMMIT" "$ARCH" <<'PY' || die "build.json verification failed"
import json, sys
b = json.load(open(sys.argv[1]))
assert b["version"] == sys.argv[2], "build.json version mismatch"
assert b["commit"] == sys.argv[3], "build.json commit mismatch"
assert b["platform"] == "linux", "build.json platform mismatch"
assert b["arch"] == sys.argv[4], "build.json arch mismatch"
assert b["nodeVersion"].split(".")[0] == "24", "build.json node mismatch"
print("build.json ok", file=sys.stderr)
PY
  rm -rf "$tmp"

  local need avail
  need=$(( $(stat -c%s "$TARBALL") * 3 / 1024 ))
  avail=$(df -Pk "$ROOT" | awk 'NR==2{print $4}')
  [ "$avail" -gt "$need" ] || die "low disk space on $ROOT"
}

extract_package() {
  # hostile-entry scan
  python3 - "$TARBALL" <<'PY' || die "tarball failed safety scan"
import sys, tarfile
with tarfile.open(sys.argv[1]) as t:
    for m in t.getmembers():
        n = m.name
        assert not n.startswith("/"), f"absolute path {n}"
        assert ".." not in n.split("/"), f"escapes dir {n}"
        assert not (m.isdev() or m.isfifo()), f"special file {n}"
        if m.issym() or m.islnk():
            tgt = m.linkname
            assert not tgt.startswith("/"), f"absolute link {n} -> {tgt}"
            base = n.split("/")[:-1] + tgt.split("/")
            depth = 0
            for p in base:
                if p in ("", "."): continue
                depth = depth - 1 if p == ".." else depth + 1
                assert depth >= 0, f"link escapes {n} -> {tgt}"
PY
  if [ -d "$DESTDIR" ]; then
    # same version+commit may only contain the same bytes — never reuse or
    # overwrite a different package under an existing release dir
    [ -f "$DESTDIR/.pkg-sha256" ] && [ "$(cat "$DESTDIR/.pkg-sha256")" = "$TARBALL_SHA" ] \
      || die "$DESTDIR exists with different content — refusing to overwrite"
  else
    mkdir -p "$DESTDIR"
    tar -xzf "$TARBALL" -C "$DESTDIR"
    printf '%s\n' "$TARBALL_SHA" > "$DESTDIR/.pkg-sha256"
  fi
  chown -R root:root "$DESTDIR"
  chmod -R a+rX "$DESTDIR"
}

deploy_window() {
  systemctl stop "$BOT_UNIT" 2>/dev/null || true
  systemctl stop "$API_UNIT" 2>/dev/null || true

  pg_dump -Fc -f "$DUMP" || return 1
  pg_restore --list "$DUMP" >/dev/null || return 1

  run_release_db verify --plan "$STATE_DIR/plan" || return 1
  run_release_db apply --plan "$STATE_DIR/plan" || return 1

  ln -sfn "$DESTDIR" "$ROOT/bin"
  systemctl start "$API_UNIT" || return 1
  wait_health "http://localhost:$(api_port)/health" 30 || return 1
  systemctl start "$BOT_UNIT" || return 1
  wait_health "http://localhost:$(health_port)/status" 120 || return 1

  local api_cwd
  api_cwd=$(readlink -f "/proc/$(systemctl show -p MainPID --value $API_UNIT)/cwd" 2>/dev/null || true)
  [ "$api_cwd" = "$DESTDIR" ]
}

wait_health() { # url timeout_s
  local deadline=$((SECONDS + $2))
  while [ $SECONDS -lt $deadline ]; do
    curl -fsS "$1" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

verify_health() {
  wait_health "http://localhost:$(api_port)/health" 10 &&
    wait_health "http://localhost:$(health_port)/status" 10
}

# release-db runs as the service user; .env reaches it via EnvironmentFile,
# so the connection string never appears on a command line.
run_release_db() {
  local sub=$1; shift
  systemd-run --quiet --wait --collect \
    --property=User=discordbot \
    --property=Group=discordbot \
    --property=EnvironmentFile="$ENV_FILE" \
    --property=WorkingDirectory="$DESTDIR" \
    /usr/bin/node "$DESTDIR/scripts/release-db.cjs" "$sub" "$@"
}

restore() {
  say "restore: $1 — rolling back"
  systemctl stop "$BOT_UNIT" 2>/dev/null || true
  systemctl stop "$API_UNIT" 2>/dev/null || true
  if [ -f "$DUMP" ] && db_ok; then
    pg_restore --clean --if-exists -d "$PGDATABASE" "$DUMP" \
      || die "pg_restore failed — manual fix required (state on disk)"
  fi
  local back="$PREV_BIN"
  if [ -z "$back" ] || [ ! -d "$back" ]; then
    [ -d /opt/discord-bot ] && back=/opt/discord-bot
  fi
  [ -n "$back" ] || die "no previous version to restore to — manual fix required"
  ln -sfn "$back" "$ROOT/bin"
  systemctl start "$API_UNIT" || die "old api failed to start — manual fix required"
  wait_health "http://localhost:$(api_port)/health" 30 || die "old api unhealthy — manual fix required"
  systemctl start "$BOT_UNIT" || die "old bot failed to start — manual fix required"
  wait_health "http://localhost:$(health_port)/status" 60 || die "old bot unhealthy — manual fix required"
  state_set result restored
  say "restore: previous version back up"
}

state_get() {
  python3 - "$STATE_FILE" "$1" <<'PY' 2>/dev/null || true
import json, sys
try: print(json.load(open(sys.argv[1])).get(sys.argv[2], ""))
except Exception: print("")
PY
}
state_set() {
  python3 - "$STATE_FILE" "$1" "$2" <<'PY'
import json, os, sys
p, k, v = sys.argv[1:4]
try: st = json.load(open(p))
except Exception: st = {}
st[k] = v
tmp = p + ".tmp"
json.dump(st, open(tmp, "w"))
os.replace(tmp, p)
PY
}
state_write_success() {
  python3 - "$STATE_FILE" "$VERSION" "$REL_COMMIT" "$PREV_BIN" "$DUMP" <<'PY'
import json, os, sys, time
p, ver, commit, prev, dump = sys.argv[1:6]
st = {
    "result": "ok", "version": ver, "commit": commit,
    "prev_bin": prev or "none", "dump": dump,
    "deployedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
tmp = p + ".tmp"
json.dump(st, open(tmp, "w"))
os.replace(tmp, p)
PY
}

cleanup_old() {
  python3 - "$ROOT/releases" "$VERSION" "$PREV_BIN" "$BACKUP_DIR" <<'PY'
import os, re, shutil, sys
rel, cur, prev, bdir = sys.argv[1:5]
keep = {d for d in os.listdir(rel) if d.startswith(cur + "-")}
prev_base = os.path.basename(prev or "")
if prev_base in os.listdir(rel):
    keep.add(prev_base)
for d in os.listdir(rel):
    if d not in keep:
        shutil.rmtree(os.path.join(rel, d), ignore_errors=True)
if os.path.isdir(bdir):
    vers = keep
    for f in os.listdir(bdir):
        m = re.match(r"pre-(\d+\.\d+\.\d+)-", f)
        if m and not any(m.group(1) == v.rsplit("-", 1)[0] for v in vers):
            os.remove(os.path.join(bdir, f))
PY
}

main "$@"
