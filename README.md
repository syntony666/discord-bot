# Discord Bot

> Modular Discord bot built with TypeScript, Discordeno, RxJS, and Prisma  
> Featuring reactive event streams, clean architecture, and strict type safety

**Version:** 5.0.0-alpha.1

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Development Workflow](#-development-workflow)
- [Code Conventions](#-code-conventions)
- [Design Patterns](#-design-patterns)
- [Testing & Debugging](#-testing--debugging)
- [Deployment](#-deployment)
- [Resources](#-resources)

***

## ✨ Key Features

- **🔑 Keyword Auto-Reply** - Pattern-based message responses (exact/contains matching)
- **🎭 Reaction Roles** - Role assignment via emoji reactions with multiple modes (Normal/Unique/Verify)
- **👋 Member Notifications** - Customizable join/leave announcements with template variables
- **� Stream Notifications** - Twitch/YouTube stream alerts with customizable channels
- **� Status Commands** - Bot and guild information display
- **📄 Generic Paginator** - Type-safe, reusable pagination system for any data type
- **✅ Confirmation Dialogs** - Interactive confirmation prompts for destructive actions
- **🔄 Hot-Reload** - Development mode with automatic restart on code changes
- **📊 Structured Logging** - Production-ready logging with pino
- **⏰ Scheduler Service** - Cron-based task scheduling for periodic operations

**Built as a framework/template for creating scalable, maintainable Discord bots.**


## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Language** | TypeScript 5.9.3 | Type-safe development |
| **Discord** | Discordeno v21.0.0 | Lightweight Discord API wrapper |
| **Reactive** | RxJS 7.8.2 | Event stream management |
| **Database** | Prisma 7.2.0 + PostgreSQL | Type-safe ORM with PostgreSQL adapter |
| **Logger** | pino 10.1.0 | Structured logging |
| **Dev Tools** | ts-node-dev, tsconfig-paths | Hot reload & path aliases |


## 🏗️ Architecture

### Core Principles

1. **Reactive Programming**: All Discord events flow through RxJS Observables
2. **Dependency Inversion**: Features depend on Observable interfaces, not concrete implementations
3. **Modular Design**: Clear separation between layers (Core → Platforms → Features → Commands → Shared)
4. **Type Safety**: Strict TypeScript with full type inference

### Event Flow

```
Discord Event → bot.events → RxJS Subject → Observable$ → Feature Subscriptions
→ Service Layer → Module Layer (Prisma) → Database → Response

Scheduler Service → Cron Jobs → Feature Operations → Database Updates
```

### Layer Responsibilities

| Layer | Purpose | Dependencies |
|-------|---------|--------------|
| **Core** | Framework-agnostic utilities | None |
| **Platforms** | External service adapters | Core |
| **Features** | Business logic & event handling | Core, Platforms |
| **Commands** | Discord command handlers | Core, Features, Shared |
| **Shared** | Reusable UI/UX components | Core, Platforms |

***

## 📁 Project Structure

```
/
├── prisma.config.ts            # Prisma configuration
├── prisma/
│   └── schema.prisma           # Database schema definition
│
src/
├── core/
│   ├── bootstrap/              # App initialization & DI
│   │   ├── app.bootstrap.ts
│   │   ├── command.registry.ts
│   │   ├── feature.interface.ts
│   │   └── feature.registry.ts
│   ├── config/                 # Environment configuration
│   │   ├── app.config.ts
│   │   ├── colors.config.ts
│   │   ├── discord.config.ts
│   │   ├── index.ts
│   │   └── constants/
│   │       ├── button-styles.ts
│   │       ├── custom-ids.ts
│   │       ├── index.ts
│   │       └── timeouts.ts
│   ├── errors/                 # Custom error definitions
│   │   ├── discord-error-codes.ts
│   │   ├── discord-error.handler.ts
│   │   ├── error-context.type.ts
│   │   ├── error-types.ts
│   │   └── index.ts
│   ├── logger/                 # Logger configuration
│   │   ├── index.ts
│   │   └── serializer.ts
│   ├── rx/
│   │   ├── bus.ts              # RxJS event bus
│   │   └── operators/
│   │       └── handle-discord-error.ts
│   ├── scheduler/              # Task scheduling
│   │   ├── index.ts
│   │   └── scheduler.service.ts
│   ├── signals/
│   │   └── signal.ts           # Simple state management
│   ├── bot-info.ts
│   └── logger.ts
│
├── platforms/                  # External integrations
│   ├── discordeno/
│   │   ├── bot.client.ts       # Bot creation + events → Observables
│   │   ├── bot.config.ts
│   │   ├── bot.events.ts
│   │   ├── commands-loader.ts  # Auto-register commands from JSON
│   │   └── commands.json       # Slash command definitions
│   └── database/
│       └── prisma.client.ts    # PrismaClient singleton
│
├── features/                   # Business domains
│   ├── guild/
│   │   ├── guild.feature.ts
│   │   ├── guild.module.ts
│   │   └── guild.types.ts
│   ├── keyword/
│   │   ├── keyword.feature.ts
│   │   ├── keyword.module.ts
│   │   ├── keyword.service.ts
│   │   └── keyword.select.ts
│   ├── reaction-role/
│   │   ├── reaction-role.feature.ts
│   │   ├── reaction-role.module.ts
│   │   ├── reaction-role.service.ts
│   │   ├── reaction-role.select.ts
│   │   └── internal/
│   │       └── emoji.helper.ts
│   ├── member-notify/
│   │   ├── member-notify.feature.ts
│   │   ├── member-notify.module.ts
│   │   ├── member-notify.service.ts
│   │   └── member-notify.select.ts
│   └── stream-notify/
│       ├── stream-notify.feature.ts
│       ├── stream-notify.module.ts
│       ├── stream-notify.service.ts
│       ├── stream-notify.select.ts
│       ├── stream-notify.types.ts
│       └── platforms/
│           ├── platform.interface.ts
│           ├── twitch.service.ts
│           └── youtube.service.ts
│
├── commands/                   # Discord command handlers
│   ├── keyword/
│   │   ├── keyword.command.ts
│   │   ├── keyword.types.ts
│   │   ├── keyword.helpers.ts
│   │   ├── internal/
│   │   │   ├── confirmations.ts
│   │   │   └── operations.ts
│   │   └── subcommands/
│   │       ├── add.ts
│   │       ├── delete.ts
│   │       ├── edit.ts
│   │       └── list.ts
│   ├── reaction-role/
│   │   ├── reaction-role.command.ts
│   │   ├── reaction-role.types.ts
│   │   ├── reaction-role.helpers.ts
│   │   ├── internal/
│   │   │   ├── confirmations.ts
│   │   │   └── operations.ts
│   │   └── subcommands/
│   │       ├── panel-create.ts
│   │       ├── panel-delete.ts
│   │       ├── panel-edit.ts
│   │       ├── panel-list.ts
│   │       ├── role-add.ts
│   │       ├── role-list.ts
│   │       └── role-remove.ts
│   ├── member-notify/
│   │   ├── member-notify.command.ts
│   │   ├── member-notify.types.ts
│   │   ├── member-notify.helpers.ts
│   │   ├── internal/
│   │   │   ├── confirmations.ts
│   │   │   └── operations.ts
│   │   └── subcommands/
│   │       ├── disable.ts
│   │       ├── enable.ts
│   │       ├── message.ts
│   │       ├── status.ts
│   │       ├── test.ts
│   │       └── toggle.ts
│   ├── status/
│   │   ├── status.command.ts
│   │   ├── status.types.ts
│   │   ├── status.helpers.ts
│   │   ├── internal/
│   │   │   └── operations.ts
│   │   └── subcommands/
│   │       ├── bot.ts
│   │       ├── guild.ts
│   │       └── notify.ts
│   └── stream-notify/
│       ├── stream-notify.command.ts
│       ├── stream-notify.types.ts
│       ├── internal/
│       │   └── operations.ts
│       └── subcommands/
│           ├── disable.ts
│           ├── enable.ts
│           ├── list.ts
│           ├── unwatch.ts
│           └── watch.ts
│
├── shared/                     # Reusable components
│   ├── confirmation/           # Confirmation dialogs
│   │   ├── confirmation.helper.ts
│   │   ├── confirmation.manager.ts
│   │   ├── confirmation.strategy.ts
│   │   ├── confirmation.types.ts
│   │   └── states/
│   │       ├── confirmation.state.ts
│   │       ├── completed.state.ts
│   │       ├── expired.state.ts
│   │       └── pending.state.ts
│   ├── error/                  # Error handling
│   │   ├── discord-errors.ts
│   │   ├── error-contexts.ts
│   │   ├── error-handler.ts
│   │   ├── error-strategy-manager.ts
│   │   ├── prisma-errors.ts
│   │   └── strategies/
│   │       ├── discord-error.strategy.ts
│   │       ├── error.strategy.ts
│   │       └── fallback-error.strategy.ts
│   ├── message/                # Message factory
│   │   ├── message.factory.ts
│   │   ├── message.helper.ts
│   │   ├── message.types.ts
│   │   ├── notification/
│   │   │   └── notification.strategy.ts
│   │   └── reply/
│   │       ├── auto-error-reply.strategy.ts
│   │       └── reply.strategy.ts
│   ├── paginator/              # Generic paginator
│   │   ├── paginator.factory.ts
│   │   ├── paginator.helper.ts
│   │   ├── paginator.types.ts
│   │   ├── core/
│   │   │   ├── paginator.actions.ts
│   │   │   ├── paginator.repository.ts
│   │   │   └── paginator.state.ts
│   │   ├── renderer/
│   │   │   ├── custom.renderer.ts
│   │   │   ├── image-list.renderer.ts
│   │   │   ├── renderer.interface.ts
│   │   │   └── text-list.renderer.ts
│   │   ├── strategy/
│   │   │   ├── paginator-button.strategy.ts
│   │   │   └── paginator.strategy.ts
│   │   └── ui/
│   │       └── paginator.ui.ts
│   └── utils/                  # Common utilities
│       └── discord.utils.ts
│
└── index.ts                    # Application entry point
```

***

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
NODE_ENV=development
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
```

**Required Intents** (Discord Developer Portal):
- ✅ MESSAGE CONTENT INTENT
- ✅ SERVER MEMBERS INTENT

### 3. Database Setup

```bash
# Push schema to database
npm run prisma:init

# Or create migration
npm run prisma:migrate
```

### 4. Run

```bash
npm run dev        # Dev mode with hot reload
npm run build      # Production build
npm start          # Run production
```

***

## 🔄 Development Workflow

### Adding a New Feature

#### 1. Define Prisma Schema

```prisma
// prisma/schema.prisma
model MyFeature {
  id        String   @id @default(cuid())
  guildId   String
  data      String
  createdAt DateTime @default(now())

  @@index([guildId])
}
```

Run migration:
```bash
npm run prisma:migrate
```

#### 2. Create Feature Structure

```
src/features/my-feature/
├── my-feature.feature.ts
├── my-feature.module.ts
├── my-feature.service.ts      # Optional
├── my-feature.select.ts       # Optional
└── my-feature.types.ts
```

#### 3. Implement Module (Data Access)

```typescript
// my-feature.module.ts
export interface MyFeatureModule {
  getByGuild$(guildId: string): Observable<MyFeature[]>;
  create$(input: CreateInput): Observable<MyFeature>;
}

export function createMyFeatureModule(prisma: PrismaClient): MyFeatureModule {
  return {
    getByGuild$(guildId: string) {
      return from(prisma.myFeature.findMany({ where: { guildId } }));
    },
    create$(input: CreateInput) {
      return from(prisma.myFeature.create({ data: input }));
    },
  };
}
```

#### 4. Implement Feature Setup

```typescript
// my-feature.feature.ts
export function setupMyFeature(prisma: PrismaClient, bot: Bot): MyFeature {
  const module = createMyFeatureModule(prisma);
  const service = createMyFeatureService(module);

  const subscription = messageCreate$
    .pipe(
      filter(msg => msg.guildId !== null),
      mergeMap(async (msg) => {
        // Handle event
      })
    )
    .subscribe();

  return {
    name: 'myfeature',
    module,
    service,
    cleanup: () => subscription.unsubscribe(),
  };
}
```

#### 5. Create Command Structure

```
src/commands/my-feature/
├── my-feature.command.ts      # Main entry point
├── my-feature.types.ts        # Type definitions
├── my-feature.helpers.ts      # Utility functions
├── internal/                  # Internal utilities
└── subcommands/               # Subcommand handlers
```

#### 6. Define Command in JSON

```json
// platforms/discordeno/commands.json
{
  "name": "myfeature",
  "description": "My feature management",
  "options": [
    {
      "type": 1,
      "name": "create",
      "description": "Create new item",
      "options": [
        {
          "type": 3,
          "name": "data",
          "description": "Data content",
          "required": true
        }
      ]
    }
  ]
}
```

#### 7. Register in Bootstrap

```typescript
// core/bootstrap/app.bootstrap.ts
export async function bootstrapApp(bot: Bot, rest: RestManager, prisma: PrismaClient) {
  await registerApplicationCommands(rest);
  
  // Setup features (guild first, then others)
  const guildFeature = setupGuildFeature(prisma, bot);
  const myFeature = setupMyFeature(prisma, bot, guildFeature.module);
  
  featureRegistry.register(guildFeature);
  featureRegistry.register(myFeature);
  
  // Setup commands
  commandRegistry.register('myfeature', setupMyFeatureCommand(myFeature.module));
  
  // Activate command registry
  commandRegistry.activate(bot);
}
```

### Development Checklist

- [ ] Prisma schema defined and migrated
- [ ] Module methods return `Observable<T>` using `from()`
- [ ] Feature provides `cleanup()` function
- [ ] Command handler registered in bootstrap
- [ ] `commands.json` updated with command definitions
- [ ] Error handling implemented with structured logging
- [ ] Logger created with `createLogger()`
- [ ] No JSDoc comments (per codebase policy)
- [ ] All inline comments are in English
- [ ] Feature dependency order respected (guild first)

***

## 📝 Code Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Feature | `*.feature.ts` | `keyword.feature.ts` |
| Module | `*.module.ts` | `keyword.module.ts` |
| Service | `*.service.ts` | `keyword.service.ts` |
| Command | `*.command.ts` | `keyword.command.ts` |
| Types | `*.types.ts` | `keyword.types.ts` |
| Selectors | `*.select.ts` | `keyword.select.ts` |

### Observable Naming

```typescript
// ✅ Use $ suffix for Observables
export const messageCreate$: Observable<BotMessage>;
const userList$ = from(prisma.user.findMany());

// ❌ Missing $ suffix
export const messageCreate: Observable<BotMessage>;
```

### Logging Standards

```typescript
import { createLogger } from '@core/logger';
const log = createLogger('ModuleName');

// ✅ Structured logging (object first, message second)
log.info({ guildId, userId, roleId }, 'Granted role via reaction');

// ❌ Don't use string interpolation
log.info(`Granted role ${roleId} to user ${userId}`);
```

### Error Handling

```typescript
// ✅ Handle errors in mergeMap
reactionAdd$
  .pipe(
    mergeMap(async (reaction) => {
      try {
        await bot.helpers.addRole(...);
        log.info({ guildId, userId }, 'Role granted');
      } catch (error: any) {
        if (error.code === 50013) {
          log.warn({ guildId, error: error.message }, 'Missing permissions');
        } else {
          log.error({ error, guildId }, 'Failed to grant role');
        }
      }
    })
  )
  .subscribe();
```

**Common Discord API Error Codes:**

| Code | Description |
|------|------------|
| 50001 | Missing Access |
| 50013 | Missing Permissions |
| 10003 | Unknown Channel |
| 10008 | Unknown Message |
| 10011 | Unknown Role |

### RxJS Usage

```typescript
// ✅ Use from() to wrap Promises
return from(prisma.keywordRule.findMany({ where: { guildId } }));

// ✅ Use lastValueFrom instead of .toPromise()
const match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));
```

### Prisma Runtime Selectors

**Purpose:** Optimize high-frequency queries by selecting only necessary fields.

**When to Use:**
- ✅ High-frequency queries (per message/reaction event)
- ✅ Queries returning multiple records
- ✅ Cross-relation queries

**Implementation:**

```typescript
// Define runtime selector (in *.select.ts)
export const keywordRuntimeSelect = {
  guildId: true,
  pattern: true,
  matchType: true,
  response: true,
  enabled: true,
} as const satisfies Prisma.KeywordRuleSelect;

export type KeywordRuntime = Prisma.KeywordRuleGetPayload<{
  select: typeof keywordRuntimeSelect;
}>;

// Use in module
function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    getActiveRules$(guildId: string) {
      return from(
        prisma.keywordRule.findMany({
          where: { guildId, enabled: true },
          select: keywordRuntimeSelect,
        })
      );
    },
  };
}
```

### Comments & Documentation

**Comment Policy:**
- ✅ **No JSDoc comments** - All JSDoc (`/** ... */`) blocks have been removed from the codebase
- ✅ **Only English comments** - All inline comments (`//`) are in English
- ✅ **Minimal commenting** - Code is self-explanatory, comments only used for complex logic

**When to Comment:**
- ✅ Complex business logic that isn't obvious
- ✅ Non-obvious constraints or edge cases
- ✅ Temporary TODO markers for future improvements

**When NOT to Comment:**
- ❌ Self-explanatory code (function names, variable names)
- ❌ Simple getter/setter methods
- ❌ Obvious implementation details

**Inline Comments:**

```typescript
// ✅ Explain WHY (complex logic)
// UNIQUE mode requires removing other roles to prevent multiple exclusive roles
if (match.mode === 'UNIQUE') {
  await removeOtherRoles();
}

// ✅ Explain non-obvious constraints
// Rate limit: 5 requests per second per user
if (userRequestCount > 5) {
  return replyError(bot, interaction, { description: 'Too many requests' });
}
```

***

## 🎨 Design Patterns

### 1. Observable-Based Module Pattern

```typescript
export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRule[]>;
  createRule$(input: CreateInput): Observable<KeywordRule>;
}

export function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    getRulesByGuild$(guildId: string) {
      return from(prisma.keywordRule.findMany({ where: { guildId } }));
    },
    createRule$(input: CreateInput) {
      return from(prisma.keywordRule.create({ data: input }));
    },
  };
}
```

### 2. Feature Setup Pattern

```typescript
export function setupKeywordFeature(prisma: PrismaClient, bot: Bot): KeywordFeature {
  const module = createKeywordModule(prisma);
  const service = createKeywordService(module);

  const subscription = messageCreate$
    .pipe(
      filter(msg => msg.guildId !== null),
      mergeMap(async (msg) => { /* handle */ })
    )
    .subscribe();

  return {
    name: 'keyword',
    module,
    service,
    cleanup: () => {
      subscription.unsubscribe();
      log.info('Keyword feature cleaned up');
    },
  };
}
```

### 3. Command Registry Pattern

```typescript
// Register handlers
commandRegistry.registerCommand('keyword', keywordHandler);
commandRegistry.registerCustomIdHandler('pg:', paginatorHandler);

// Activate routing
commandRegistry.activate(bot);
```

### 6. Message Factory

```typescript
// Success/Error replies
await replySuccess(bot, interaction, { description: 'Done!' });
await replyError(bot, interaction, { description: 'Failed!' });

// Auto error translation
await replyAutoError(bot, interaction, error, {
  duplicate: 'Already exists',
  notFound: 'Not found',
});
```

### 7. Confirmation Dialogs

```typescript
// Create confirmation for destructive actions
await createConfirmation(
  bot,
  interaction,
  {
    confirmationType: 'delete_item',
    userId: interaction.user.id,
    guildId: interaction.guildId,
    data: { itemId: '123' },
    expiresIn: Timeouts.CONFIRMATION_MS,
    embed: {
      title: '⚠️ Confirm Delete',
      description: 'This action cannot be undone.',
    },
    buttons: {
      confirmLabel: 'Delete',
      confirmStyle: ButtonStyles.DANGER,
      cancelLabel: 'Cancel',
      cancelStyle: ButtonStyles.SECONDARY,
    },
  },
  {
    onConfirm: async (bot, interaction, data) => {
      await deleteItem(data.itemId);
      await replySuccess(bot, interaction, { description: 'Item deleted' });
    },
    onCancel: async (bot, interaction) => {
      await replyInfo(bot, interaction, { description: 'Cancelled' });
    },
  }
);
```

### 8. Scheduler Service

```typescript
// Create scheduled tasks
const scheduler = createSchedulerService();

// Add cron job
scheduler.addJob('cleanup', '0 2 * * *', async () => {
  await cleanupExpiredData();
});

// Start scheduler
scheduler.start();

// Cleanup on shutdown
scheduler.stop();
```

### 9. Generic Paginator

```typescript
await replyTextList({
  bot,
  interaction,
  items: keywords,
  title: (count) => `Keywords (${count} total)`,
  mapItem: (rule) => `• \`${rule.pattern}\` → ${rule.response}`,
  pageSize: 10,
});
```

***

## 🧪 Testing & Debugging

### View Logs

```bash
# Colored logs in dev mode
npm run dev

# Filter by module
npm run dev | grep KeywordFeature

# Query structured logs
npm run dev | grep '"guildId":"123456789"'
npm run dev | grep '"level":"error"'
```

### Prisma Studio

```bash
npx prisma studio  # Opens GUI at http://localhost:5555
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Commands not appearing | Check `commands.json` + Bot Intents |
| Message content empty | Enable MESSAGE CONTENT INTENT in Discord Portal |
| Database connection fails | Check `.env` DATABASE_URL |
| TypeScript paths not resolving | Verify `-r tsconfig-paths/register` in dev script |

***

## 🚀 Deployment

### Build Production

```bash
npm run build
npm run prisma:deploy
npm start
```

### Docker Setup

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  bot:
    build: .
    env_file: .env
    depends_on:
      - postgres
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: discord_bot
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

***

## 📚 Resources

- [Discordeno Docs](https://discordeno.js.org/)
- [RxJS Documentation](https://rxjs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

***

## 📜 License

MIT License - See [LICENSE](./LICENSE)

***

**Happy Coding! 🎉**
