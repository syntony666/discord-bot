# Discord Bot (TypeScript + Discordeno + RxJS + Prisma)

A modular **TypeScript / Discordeno / RxJS / Prisma / PostgreSQL / pino** Discord bot template featuring an Observable-based event pipeline and clean architecture principles. Designed as a scalable foundation for medium to large-scale Discord bots.

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode with `exactOptionalPropertyTypes`)
- **Discord SDK**: Discordeno v21 (`@discordeno/bot`, `@discordeno/rest`)
- **Reactive**: RxJS 7.8+
- **ORM / Database**: Prisma + PostgreSQL
- **Logging**: pino (with pino-pretty for development)
- **Configuration**: dotenv

## 🏗️ Architecture Overview

### Core Principles

- **Reactive Programming**: All Discord events converted to RxJS Observables
- **Dependency Inversion**: Services depend on Observable interfaces, not concrete implementations
- **Modular Design**: Clear separation between core, platforms, features, and adapters
- **Type Safety**: Strict TypeScript with full type inference
- **Strategy Pattern**: Pluggable renderers and handlers for extensibility

### Event Flow

```
Discord Event (messageCreate/interactionCreate)
  ↓
Discordeno bot.events
  ↓
RxJS Subject (messageCreate$ / interactionCreate$)
  ↓
Feature/Adapter Subscriptions
  ↓
Business Logic (Service Layer)
  ↓
Data Layer (Prisma Module)
  ↓
Response (bot.helpers)
```

## 📁 Project Structure

```
src/
  core/                           # Framework-agnostic core
    config/                       # Environment & app configuration
    logger.ts                     # pino logger factory
    rx/
      bus.ts                      # RxJS event bus (Subjects for all events)
    signals/
      signal.ts                   # Lightweight state management
    bootstrap/
      app.bootstrap.ts            # Application initialization & DI

  platforms/                      # External integrations
    discordeno/
      bot.client.ts               # Bot creation + events → Observables
      commands-loader.ts          # Auto-register commands from JSON
    database/
      prisma.client.ts            # PrismaClient singleton

  features/                       # Business domains
    keyword/
      keyword.feature.ts          # Feature setup & message handler
      keyword.module.ts           # Data access (Prisma → Observables)
      keyword.service.ts          # Business logic + caching

  adapters/                       # Discord-specific implementations
    discord/
      commands/
        command.registry.ts       # Command router (slash commands + customId)
        keyword.command.ts        # Command handlers
      shared/
        message/
          message.factory.ts      # Factory pattern for replies/notifications
          message.helper.ts       # Convenience functions
          reply/                  # Reply strategies
          notification/           # Notification strategies
        paginator/
          core/                   # State machine, repository, actions
          renderer/               # PageRenderer<T> implementations
          strategy/               # Button interaction handling
          ui/                     # UI component builders
      commands.json               # Slash command definitions
```

### Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|---------------|-------------|
| **Core** | Framework-agnostic utilities, logging, config | None |
| **Platforms** | External service adapters (Discord, DB) | Core |
| **Features** | Business logic, domain models | Core, Platforms |
| **Adapters** | Discord-specific UI/UX implementations | Core, Features |

## 🚀 Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create `.env`:

```env
NODE_ENV=development
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
```

**Required**: Enable **MESSAGE CONTENT INTENT** in [Discord Developer Portal](https://discord.com/developers/applications).

### 3. Database Initialization

```bash
# Push Prisma schema
npm run prisma:init

# Or use migrations
npm run prisma:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Hot reload enabled via `ts-node-dev` + `tsconfig-paths`.

### 5. Production Build

```bash
npm run build
npm start
```

## 🧩 Design Patterns & Practices

### 1. Observable-Based Event Bus

All Discord events flow through RxJS Subjects in `core/rx/bus.ts`:

```typescript
// Emit events from Discordeno
messageCreate.next(message);
interactionCreate.next(interaction);

// Subscribe in features/adapters
messageCreate$.subscribe(msg => { /* handle */ });
```

**Benefits**: Decouples event sources from handlers, enables reactive pipelines.

### 2. Feature Modules (Observable API)

Features expose Observable-based APIs, hiding Prisma:

```typescript
// keyword.module.ts
export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRule[]>;
  createRule$(input: CreateInput): Observable<KeywordRule>;
  deleteRule$(guildId: string, pattern: string): Observable<void>;
}

// Implementation wraps Prisma with from()
return from(prisma.keywordRule.findMany({ where: { guildId } }));
```

**Benefits**: Testability, framework independence, composable pipelines.

### 3. Command Registry (Dynamic Routing)

```typescript
// Register command handlers
commandRegistry.registerCommand('keyword', handler);

// Register customId prefix handlers (for buttons, modals)
commandRegistry.registerCustomIdHandler('pg:', paginatorHandler);

// Activate subscriptions
commandRegistry.activate(bot);
```

**Benefits**: Centralized routing, auto-cleanup, supports customId patterns.

### 4. Message Factory (Strategy Pattern)

```typescript
// Unified interface for all message types
await replySuccess(bot, interaction, { description: 'Done!' });
await replyError(bot, interaction, { description: 'Failed!' });
await replyAutoError(bot, interaction, error, { duplicate: 'Custom msg' });

// Notifications
await notify(bot, channelId, {
  type: 'announcement',
  title: 'Title',
  description: 'Content',
});
```

**Benefits**: Consistent styling, automatic error translation, extensible types.

### 5. Generic Paginator

```typescript
// PageRenderer<T> strategy
interface PageRenderer<T> {
  renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}

// Usage
await replyTextList({
  bot,
  interaction,
  items: data,
  title: () => `Page Title`,
  mapItem: item => `- ${item.name}`,
  pageSize: 10,
});
```

**Benefits**: Type-safe, reusable for any data type, customizable rendering.

### 6. State Management (Signals)

Simple reactive state without external dependencies:

```typescript
const [getCache, setCache] = createSignal(new Map());

// Reactive updates
setCache(new Map(getCache()));
```

**Benefits**: Lightweight, no framework lock-in.

## 🔧 Configuration

### TypeScript Config

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@core/*": ["src/core/*"],
      "@platforms/*": ["src/platforms/*"],
      "@features/*": ["src/features/*"],
      "@adapters/*": ["src/adapters/*"]
    }
  }
}
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/.prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Output path ensures generated client is within `src/` for path aliases.

## 📝 Available Scripts

```bash
npm run dev              # Development with hot reload
npm run build            # Production build
npm start                # Run production build
npm run prisma:init      # Push schema to database
npm run prisma:migrate   # Create and apply migrations
npm run prisma:deploy    # Deploy migrations (production)
npm run format           # Format with Prettier
npm run format:check     # Check formatting
```

## 🧪 Code Conventions

### 1. Observable Naming

- **Suffix with `$`**: `messageCreate$`, `interactionCreate$`
- **Module methods**: `getRulesByGuild$()`, `createRule$()`

### 2. Logging

```typescript
import { createLogger } from '@core/logger';
const log = createLogger('ModuleName');

log.info({ data }, 'Message');
log.error({ error }, 'Error message');
```

### 3. Error Handling

```typescript
// Automatic Prisma/Discord error translation
await replyAutoError(bot, interaction, error, {
  duplicate: 'Already exists',
  notFound: 'Not found',
  generic: 'Unknown error',
});
```

### 4. Type Safety

- Avoid `any` - use `unknown` or proper types
- Use discriminated unions for message types
- Leverage TypeScript's strict mode

### 5. File Naming

- **Modules**: `*.module.ts`
- **Services**: `*.service.ts`
- **Features**: `*.feature.ts`
- **Commands**: `*.command.ts`
- **Types**: `*.types.ts`

## 🔄 Bootstrap Flow

```typescript
// src/index.ts
async function main() {
  await connectPrisma();
  const { bot, rest, start } = createBotClient();
  await bootstrapApp(bot, rest, prisma);
  await start();
}

// src/core/bootstrap/app.bootstrap.ts
export async function bootstrapApp(bot, rest, prisma) {
  // 1. Register application commands
  await registerApplicationCommands(rest);
  
  // 2. Setup paginator handlers
  commandRegistry.registerCustomIdHandler('pg:', paginatorHandler);
  
  // 3. Setup features
  setupKeywordFeature(prisma, bot);
  
  // 4. Activate command registry
  commandRegistry.activate(bot);
}
```

## 🎯 Extending the Bot

### Adding a New Feature

1. **Create feature module** (`features/myfeature/myfeature.module.ts`)
   - Define Observable-based data access API
   - Wrap Prisma operations with `from()`

2. **Create feature service** (`features/myfeature/myfeature.service.ts`)
   - Implement business logic
   - Use module's Observable API

3. **Create feature setup** (`features/myfeature/myfeature.feature.ts`)
   - Subscribe to event bus
   - Register command handlers
   - Return cleanup function

4. **Bootstrap** (`core/bootstrap/app.bootstrap.ts`)
   - Call `setupMyFeature(prisma, bot)`

### Adding a New Command

1. **Define in `commands.json`**
2. **Create handler** in `adapters/discord/commands/`
3. **Register** with `commandRegistry.registerCommand()`

## 🔮 Future Improvements

- **Testing**: Unit tests for services, integration tests for features
- **Metrics**: Prometheus metrics for observability
- **Caching**: Redis integration for distributed caching
- **Queue System**: Bull/BullMQ for background jobs
- **Multi-Shard**: Discordeno sharding support

## 📜 License

MIT License - See [LICENSE](./LICENSE)

## 🙏 Built With

- [Discordeno](https://discordeno.js.org/)
- [RxJS](https://rxjs.dev/)
- [Prisma](https://www.prisma.io/)
- [pino](https://getpino.io/)
