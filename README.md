# Discord Bot

[![Made with TypeScript](https://img.shields.io/github/package-json/dependency-version/syntony666/discord-bot/dev/typescript?logo=typescript&logoColor=3178C6&color=f328a8)](https://typescriptlang.org "Go to TypeScript homepage")
[![Package - discord.js](https://img.shields.io/github/package-json/dependency-version/syntony666/discord-bot/discord.js?color=blue)](https://www.npmjs.com/package/discord.js)
![Build Status](https://github.com/syntony666/discord-bot/actions/workflows/deploy.yml/badge.svg)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

[![view - Documentation](https://img.shields.io/badge/view-Documentation-834abe?style=for-the-badge)](https://discord-bot.syntony666.com)

---

## Prerequisite

Fill the `.env.example` and rename to `.env`

If you don't use MariaDB, some hard-coded stuff you need to do by yourself. 

## Quick Install

### Using Docker

You can just build it and run it in single command `docker-compose up`

If you want to run in the background: `docker-compose up -d`

## Manual Install

### Database

Prepare the clean database with `utf8mb4` encoding and run it

> Recommand: Using Docker

```yml
version: '3'

services:
  mariadb:
    image: mariadb
    ports:
      - '3306:3306'
    restart: always
    environment:
      - MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=yes
      - MARIADB_USER=user
      - MARIADB_DATABASE=discord_bot
      - MARIADB_CHARACTER_SET=utf8mb4
      - MARIADB_COLLATE=utf8mb4_general_ci
    volumes:
      - data:/var/lib/mysql
```

Migrate the schema

```bash
npm run migrate
```

### Install and Run the bot

Node.js 18.12.0+ is required.

```bash
npm install

npm run app
```
