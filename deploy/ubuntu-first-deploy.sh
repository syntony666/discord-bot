#!/usr/bin/env bash
set -euo pipefail

APP_USER=discordbot
APP_DIR=/opt/discord-bot
SERVICE_NAME=discord-bot
DB_NAME=discord_bot
DB_USER=discord_bot
DB_PASS=discord_bot_pass

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy/ubuntu-first-deploy.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /usr/share/keyrings/nodesource.gpg
  echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list >/dev/null
  apt-get update
  apt-get install -y nodejs
fi

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

if ! command -v psql >/dev/null 2>&1; then
  apt-get update
  apt-get install -y postgresql
  systemctl enable postgresql
  systemctl start postgresql
fi

if ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | \
  grep -q 1 || sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS'"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | \
  grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"

mkdir -p "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
HEALTH_PORT=3000
DISCORD_TOKEN=
DISCORD_APP_ID=
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
EOF
  chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env. Please fill required values and rerun."
  exit 1
fi

if grep -q '^DATABASE_URL=$' "$APP_DIR/.env"; then
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME#" "$APP_DIR/.env"
fi

if systemctl list-unit-files --type=service | grep -q "^$SERVICE_NAME.service"; then
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
  fi
fi

if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  git clone https://github.com/syntony666/discord-bot.git "$APP_DIR"
fi

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

cd "$APP_DIR"

set -a
source "$APP_DIR/.env"
set +a

sudo -u "$APP_USER" git pull --ff-only

sudo -u "$APP_USER" npm install
sudo -u "$APP_USER" npm run prisma:deploy
sudo -u "$APP_USER" npm run build

install -d "$APP_DIR/dist/platforms/discordeno"
install -m 0644 \
  "$APP_DIR/src/platforms/discordeno/commands.json" \
  "$APP_DIR/dist/platforms/discordeno/commands.json"

cat <<EOF > "/etc/systemd/system/$SERVICE_NAME.service"
[Unit]
Description=Discord Bot Service
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

systemctl status "$SERVICE_NAME" --no-pager
