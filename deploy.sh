echo "Shutting down discord bot"
docker-compose down
echo "Deploying discord bot..."
cd ../discord-bot
git reset --hard
git pull
docker image rm node
docker-compose up -d
echo "Done."