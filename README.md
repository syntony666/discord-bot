# Discord Bot (TypeScript + Discordeno + RxJS + Prisma)

A modular **TypeScript / Discordeno / RxJS / Prisma / Postgres / pino** Discord bot. It uses an Observable-based event pipeline and feature modules, suitable as a starting point for medium-size to large bots.

Currently implemented:

- Keyword auto-reply (EXACT / CONTAINS, per-guild config)
- `/keyword add/list/delete` commands to manage rules
- Generic paginated paginator (Prev / Page / Next, 30s TTL), reusable for any list
- Postgres + Prisma schema setup
- pino logging + pino-pretty (for development)

## Tech Stack

- Runtime: Node.js 18+
- Language: TypeScript (strict, exactOptionalPropertyTypes)
- Discord SDK: Discordeno (`@discordeno/bot`, `@discordeno/rest`)
- Reactive: RxJS (message / interaction events converted to Observables)
- ORM / DB: Prisma + PostgreSQL
- Logging: pino (with pino-pretty in dev)
- Config: dotenv

## Project Structure

```txt
src/
  core/
    config.ts                 # env & constants
    logger.ts                 # pino logger
    rx/
      bus.ts                  # messageCreate$ / interactionCreate$
    signals/
      signal.ts               # simple signal implementation

  platforms/
    discordeno/
      bot.client.ts           # createBot + events → Observables
      commands-loader.ts      # register slash commands from commands.json
    database/
      prisma.client.ts        # PrismaClient singleton

  features/
    keyword/
      keyword.module.ts       # Prisma + Observable access for KeywordRule
      keyword.service.ts      # EXACT / CONTAINS matching + cache

  adapters/
    discord/
      commands/
        keyword.command.ts    # /keyword add/list/delete
      message.event.ts        # subscribe messageCreate$, call keyword service
      interaction.event.ts    # subscribe interactionCreate$, dispatch to paginator / keyword
      paginator/
        paginator.types.ts
        paginator.state.ts
        paginator.repository.ts
        paginator.actions.ts
        paginator.service.ts
      commands.json           # all application commands definitions (JSON)
```

## Development

### 1. Install dependencies

```bash
npm install
```

If this is a fresh clone, run Prisma init first (creates `prisma/schema.prisma` and `.env`):

```bash
npx prisma init --datasource-provider postgresql
```

### 2. Configure `.env`

Create a `.env` file in the project root:

```env
NODE_ENV=development
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
```

Also enable **MESSAGE CONTENT INTENT** in the Discord Developer Portal.[web:228]

### 3. Create / update database schema

```bash
npm run prisma:init   # prisma db push
# or, if you prefer migrations:
npm run prisma:migrate
```

### 4. Run the bot in development

```bash
npm run dev
```

- Uses `ts-node-dev` + `tsconfig-paths`.
- Connects to Postgres, registers commands, then starts the Discord Gateway.

### 5. Build & run in production

```bash
npm run build
npm start
```

## Implemented Features

### Keyword Auto-Reply

- Per-guild keyword rules stored in `KeywordRule` table (Prisma).[web:221]
- Two match types:
  - `EXACT`: trimmed message content equals pattern.
  - `CONTAINS`: message content includes pattern.
- Event flow:
  - Discordeno `messageCreate` → `messageCreate$` (RxJS Subject)
    → `registerMessageHandler` → `KeywordService.findMatch$` → `bot.helpers.sendMessage()`.

### `/keyword` Commands

- `/keyword add pattern match_type response`
- `/keyword list`
- `/keyword delete pattern`
- Command schema is defined in `adapters/discord/commands.json` and registered at startup by `commands-loader.ts`.[web:278][web:279]

### Generic Paginator

Located under `adapters/discord/paginator/`:

- `PageRenderer<T>` Strategy: converts any `T[]` into a single page (embed / text).
- `PaginatorService`:
  - `createPaginator(bot, interaction, items, renderer, options)` – creates a session & sends the first page.
  - `handleButton(bot, interaction)` – handles Prev / Page / Next button interactions.
- `PaginatorState + reducePaginatorState` – small state machine (currentPage / totalPages / expiresAt).
- `PaginatorSessionRepository` – in-memory Map + signals to store sessions.
- Button `customId`: `pg:<sessionId>:prev|page|next` (sessionId is a random 5-char token).

`/keyword list` uses the paginator:

- 10 items per page.
- Prev / Next automatically enabled/disabled at first/last page.
- Middle button label shows `current / total` pages; currently clicking it only refreshes TTL, but it’s ready to be extended into a “jump to page” flow.

## Conventions

- All Discord events are converted to RxJS Observables in `core/rx/bus.ts`; feature layers should only depend on Observables, not Discord APIs directly.
- DB access lives in `*.module.ts` files; services only depend on the module’s Observable-based interface, not Prisma directly.
- Logging uses `createLogger('Scope')` from `core/logger.ts`, combined with `tap` or try/catch.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
