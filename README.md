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
- [Code Conventions](#-code-conventions)
- [Design Patterns](#-design-patterns)
- [Development Workflow](#-development-workflow)

***

## ✨ Key Features

This bot demonstrates a production-ready Discord bot architecture with:

- **🔑 Keyword Auto-Reply** - Pattern-based message responses (exact/contains matching)
- **🎭 Reaction Roles** - Role assignment via emoji reactions with multiple modes (Normal/Unique/Verify)
- **👋 Member Notifications** - Customizable join/leave announcements with template variables
- **📊 Status Commands** - Bot and guild information display
- **📄 Generic Paginator** - Type-safe, reusable pagination system for any data type
- **🔄 Hot-Reload** - Development mode with automatic restart on code changes
- **📊 Structured Logging** - Production-ready logging with pino

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
3. **Modular Design**: Clear separation between layers (Core → Platforms → Features → Adapters)
4. **Type Safety**: Strict TypeScript with full type inference

### Event Flow

```
Discord Event → bot.events → RxJS Subject → Observable$ → Feature Subscriptions
→ Service Layer → Module Layer (Prisma) → Database → Response
```

***

## 📁 Project Structure

```
/
├── prisma.config.ts            # Prisma configuration (auto-generated)
├── prisma/
│   └── schema.prisma           # Database schema definition
│
src/
├── core/                       # Framework-agnostic utilities
│   ├── bootstrap/              # App initialization & DI
│   ├── config/                 # Environment configuration
│   ├── rx/
│   │   └── bus.ts              # RxJS event bus (all events)
│   ├── signals/
│   │   └── signal.ts           # Simple state management (getter/setter)
│   ├── bot-info.ts             # Version and uptime utilities
│   └── logger.ts               # pino logger factory
│
├── platforms/                  # External integrations
│   ├── discordeno/
│   │   ├── bot.client.ts       # Bot creation + events → Observables
│   │   └── commands-loader.ts  # Auto-register commands from JSON
│   └── database/
│       └── prisma.client.ts    # PrismaClient singleton
│
├── features/                   # Business domains
│   ├── keyword/                # Auto-reply feature
│   │   ├── keyword.feature.ts  # Setup + event subscriptions
│   │   ├── keyword.module.ts   # Data access (Prisma → Observable)
│   │   ├── keyword.service.ts  # Business logic
│   │   └── keyword.types.ts    # Type definitions
│   ├── reaction-role/          # Role management via reactions
│   └── member-notify/          # Join/leave notifications
│
├── adapters/                   # Discord-specific implementations
│   └── discord/
│       ├── commands/           # Slash command handlers
│       │   ├── command.registry.ts     # Command router
│       │   ├── keyword.command.ts      # Keyword command handler
│       │   ├── member-notify.command.ts # Member notify handler
│       │   ├── status.command.ts       # Status command handler
│       │   └── reaction-role/          # Reaction role command module
│       │       ├── index.ts            # Main handler
│       │       ├── panel/              # Panel management commands
│       │       ├── role/               # Role management commands
│       │       └── reaction-role.types.ts
│       ├── commands.json       # Slash command definitions
│       └── shared/             # Reusable UI components
│           ├── message/        # Message factory (Strategy Pattern)
│           └── paginator/      # Generic paginator
│
└── index.ts                    # Application entry point
```

### Layer Responsibilities

| Layer | Purpose | Dependencies |
|-------|---------|-------------|
| **Core** | Framework-agnostic utilities | None |
| **Platforms** | External service adapters | Core |
| **Features** | Business logic | Core, Platforms |
| **Adapters** | Discord-specific UI/UX | Core, Features |

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

### 4. Run Development Server

```bash
npm run dev        # Dev mode with hot reload
npm run build      # Production build
npm start          # Run production
```

***

## 📝 Code Conventions

### 1. File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Feature | `*.feature.ts` | `keyword.feature.ts` |
| Module | `*.module.ts` | `keyword.module.ts` |
| Service | `*.service.ts` | `keyword.service.ts` |
| Command | `*.command.ts` | `keyword.command.ts` |
| Types | `*.types.ts` | `keyword.types.ts` |

### 2. Observable Naming

- **MUST** use `$` suffix for Observables
- Use camelCase naming

```typescript
// ✅ Correct
export const messageCreate$: Observable<BotMessage>;
const userList$ = from(prisma.user.findMany());

// ❌ Wrong
export const messageCreate: Observable<BotMessage>;  // Missing $
```

### 3. Observable Methods

```typescript
// ✅ Observable-returning methods use $ suffix
interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRule[]>;
  createRule$(input: CreateInput): Observable<KeywordRule>;
  deleteRule$(guildId: string, pattern: string): Observable<void>;
}
```

### 4. TypeScript Best Practices

```typescript
// ❌ Avoid any
function handleError(error: any) { }

// ✅ Use unknown or explicit types
function handleError(error: unknown) {
  if (error instanceof Error) {
    log.error({ message: error.message });
  }
}

// ✅ Use discriminated unions
type ReplyType = 
  | { type: 'success'; description: string }
  | { type: 'error'; description: string };
```

### 5. Logging Standards

```typescript
import { createLogger } from '@core/logger';
const log = createLogger('ModuleName');

// ✅ Structured logging (object first, message second)
log.info({ guildId, userId, roleId }, 'Granted role via reaction');

// ✅ Error logging with full context
log.error({ error, guildId, messageId }, 'Failed to grant role');

// ❌ Don't use string interpolation
log.info(`Granted role ${roleId} to user ${userId}`);
```

### 6. Error Handling

```typescript
// ✅ Handle errors in mergeMap
reactionAdd$
  .pipe(
    mergeMap(async (reaction) => {
      try {
        await bot.helpers.addRole(...);
        log.info({ guildId, userId }, 'Role granted');
      } catch (error: any) {
        // Handle Discord API error codes
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

| Code | Description | Meaning |
|------|------------|---------|
| 50001 | Missing Access | Channel not accessible |
| 50013 | Missing Permissions | Bot lacks required permissions |
| 10003 | Unknown Channel | Channel deleted |
| 10008 | Unknown Message | Message deleted |
| 10011 | Unknown Role | Role deleted |

### 7. Comments & Documentation

**When to Comment:**
- ✅ Public APIs (interfaces, exported functions)
- ✅ Complex business logic
- ✅ Constraints and side effects

**When NOT to Comment:**
- ❌ Self-explanatory code
- ❌ Implementation details (let code speak)
- ❌ Obvious patterns

```typescript
// ✅ Explain WHY
// UNIQUE mode requires removing other roles to prevent multiple exclusive roles
if (match.mode === 'UNIQUE') {
  await removeOtherRoles();
}

// ❌ Explain WHAT (code already shows this)
// Check if mode is UNIQUE
if (match.mode === 'UNIQUE') { }
```

**JSDoc Format:**

```typescript
/**
 * Strategy interface for rendering paginated items.
 * Implement this to create custom page layouts.
 */
export interface PageRenderer<T> {
  /**
   * Render a page of items into Discord embed format.
   * 
   * @param items - Slice of items for current page
   * @param pageIndex - Zero-based page index
   * @param totalPages - Total pages available
   * @returns Discord embed and components
   */
  renderPage(items: T[], pageIndex: number, totalPages: number): PageRenderResult;
}
```

### 8. RxJS Usage

```typescript
// ✅ Use from() to wrap Promises
return from(prisma.keywordRule.findMany({ where: { guildId } }));

// ✅ Use lastValueFrom instead of .toPromise()
const match = await lastValueFrom(service.findMatch$(guildId, messageId, emoji));

// ❌ Don't use deprecated .toPromise()
const match = await service.findMatch$(guildId, messageId, emoji).toPromise();

// ✅ Handle errors inside mergeMap
messageCreate$
  .pipe(
    filter(msg => msg.guildId !== null),
    mergeMap(async (msg) => {
      try {
        // Logic here
      } catch (error) {
        log.error({ error }, 'Failed');
      }
    })
  )
  .subscribe();
```

### 9. Prisma Runtime Selectors

**Purpose:** Optimize high-frequency database queries by selecting only necessary fields.

**When to Use Selectors:**

- ✅ High-frequency queries (per message/reaction event)
- ✅ Queries returning multiple records
- ✅ Cross-relation queries to avoid over-fetching

**When to Use Full Models:**

- ✅ Single record queries (findUnique)
- ✅ CRUD operations (create, update, delete)
- ✅ Admin/detail views
- ✅ Low-frequency operations

**Naming Convention:**

| Pattern | Example | Usage |
|---------|---------|-------|
| Runtime selector | `keywordRuntimeSelect` | High-frequency queries |
| Runtime type | `KeywordRuntime` | Derived from runtime selector |
| Full model type | `KeywordRule` | Direct from `@prisma-client/client` |

**Implementation Example:**

```typescript
// ✅ Define runtime selector (in feature.select.ts)
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

// ✅ Use in module (high-frequency query)
interface KeywordModule {
  getActiveRules$(guildId: string): Observable<KeywordRuntime[]>;
  getRuleDetail$(guildId: string, pattern: string): Observable<KeywordRule | null>;
}

function createKeywordModule(prisma: PrismaClient): KeywordModule {
  return {
    // High-frequency: use runtime selector
    getActiveRules$(guildId: string) {
      return from(
        prisma.keywordRule.findMany({
          where: { guildId, enabled: true },
          select: keywordRuntimeSelect,  // ← Runtime selector
        })
      );
    },
    
    // Low-frequency: use full model
    getRuleDetail$(guildId: string, pattern: string) {
      return from(
        prisma.keywordRule.findUnique({
          where: { guildId_pattern: { guildId, pattern } },
          // No select → returns full KeywordRule
        })
      );
    },
  };
}
```

**Performance Impact:**

| Feature | Without Select | With Select | Reduction |
|---------|---------------|-------------|-----------|
| Keyword | 6 fields | 5 fields | ~17% |
| Reaction Role | 7 fields | 4 fields | ~43% |
| Member Notify | 25 fields (3 tables joined) | 8 fields | ~68% |

**Best Practice:**
- Event handlers (message/reaction): Use runtime selectors
- Command handlers (admin ops): Use full models
- List operations: Use runtime selectors if displaying > 10 items

***

## 📋 Command Module Template

### Standard Structure

All Discord commands should follow this standardized structure for consistency and maintainability:

```
[command-name]/
├── [command-name].command.ts     (Main entry point, routing)
├── [command-name].types.ts       (Type definitions)
├── [command-name].helpers.ts     (Utility functions)
├── internal/
│   ├── confirmations.ts         (Confirmation dialog logic)
│   └── operations.ts           (Discord API operations)
└── subcommands/
    ├── [subcommand-name].ts
    ├── [subcommand-name].ts
    └── ...
```

### File Responsibilities

#### Core Files
- **`[command-name].command.ts`**
  - Main entry point and routing
  - Import all subcommand handlers
  - Unified error handling

#### Type Files
- **`[command-name].types.ts`**
  - All type definitions
  - Interface definitions
  - Confirmation data structures
  - Option enums

#### Helper Files
- **`[command-name].helpers.ts`**
  - Common utility functions
  - Formatting functions
  - Builder functions
  - Validation functions

#### Internal Tools
- **`internal/confirmations.ts`**
  - Confirmation dialog logic
  - Button handling
  - User interaction logic

- **`internal/operations.ts`**
  - Discord API operations
  - Message updates
  - Reaction add/remove
  - Error handling

#### Subcommands
- **`subcommands/[subcommand-name].ts`**
  - Single subcommand handler
  - Business logic
  - Parameter extraction
  - Result replies

### Naming Conventions

- **Main files**: `[command-name].command.ts`, `[command-name].types.ts`, `[command-name].helpers.ts`
- **Subcommands**: `[subcommand-name].ts` or `[group]-[action].ts`
- **Internal tools**: `internal/confirmations.ts`, `internal/operations.ts`
- **Types**: Concentrated in main types file

### Template Benefits

✅ **Consistency** - All commands use the same structure  
✅ **Extensibility** - Easy to add new features  
✅ **Maintainability** - Clear separation of concerns  
✅ **Reusability** - Direct copy structure to use  
✅ **Clarity** - Unified naming conventions  

### Example: Reaction Role

```
reaction-role/
├── reaction-role.command.ts     (2.8KB) - Main entry point
├── reaction-role.types.ts       (1.3KB) - Type definitions
├── reaction-role.helpers.ts     (2.7KB) - Utility functions
├── internal/
│   ├── confirmations.ts         (2.3KB) - Confirmation dialogs
│   └── operations.ts           (3.7KB) - Discord API operations
└── subcommands/
    ├── panel-create.ts          (2.8KB) - Create panel
    ├── panel-edit.ts            (5.8KB) - Edit panel
    ├── panel-delete.ts          (4.8KB) - Delete panel
    ├── panel-list.ts            (2.1KB) - List panels
    ├── role-add.ts              (3.5KB) - Add role
    ├── role-remove.ts           (5.3KB) - Remove role
    └── role-list.ts             (2.3KB) - List roles
```

This template applies to all Discord commands!

***

## 🎨 Design Patterns

### 1. Observable-Based Module Pattern

**Purpose:** Wrap data access (Prisma) as Observable API for dependency inversion.

```typescript
// Module interface
export interface KeywordModule {
  getRulesByGuild$(guildId: string): Observable<KeywordRule[]>;
  createRule$(input: CreateInput): Observable<KeywordRule>;
}

// Implementation
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

**Purpose:** Unified initialization, subscription, and cleanup.

```typescript
export interface KeywordFeature {
  module: KeywordModule;
  service: KeywordService;
  cleanup: () => void;
}

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
    module,
    service,
    cleanup: () => {
      subscription.unsubscribe();
      log.info('Feature cleaned up');
    },
  };
}
```

### 3. Command Registry Pattern

**Purpose:** Centralized command routing.

```typescript
// Register handlers
commandRegistry.registerCommand('keyword', keywordHandler);
commandRegistry.registerCustomIdHandler('pg:', paginatorHandler);

// Activate routing
commandRegistry.activate(bot);
```

### 4. Message Factory (Strategy Pattern)

**Purpose:** Unified message styling with auto error translation.

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

### 5. Generic Paginator

**Purpose:** Type-safe reusable paginator.

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

#### 2. Create Module Structure

```
src/features/my-feature/
├── my-feature.feature.ts
├── my-feature.module.ts
├── my-feature.service.ts
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

#### 4. Implement Service (Business Logic)

```typescript
// my-feature.service.ts
export function createMyFeatureService(module: MyFeatureModule) {
  return {
    processData$(guildId: string) {
      return module.getByGuild$(guildId).pipe(
        map(items => { /* business logic */ })
      );
    },
  };
}
```

#### 5. Implement Feature Setup

```typescript
// my-feature.feature.ts
export function setupMyFeature(prisma: PrismaClient, bot: Bot): MyFeatureFeature {
  const module = createMyFeatureModule(prisma);
  const service = createMyFeatureService(module);

  const subscription = messageCreate$
    .pipe(
      mergeMap(async (msg) => {
        const result = await lastValueFrom(service.processData$(msg.guildId));
        // Handle result
      })
    )
    .subscribe();

  return {
    module,
    service,
    cleanup: () => subscription.unsubscribe(),
  };
}
```

#### 6. Create Command Handler

```typescript
// adapters/discord/commands/my-feature.command.ts
export function createMyFeatureCommandHandler(bot: Bot, module: MyFeatureModule) {
  commandRegistry.registerCommand('myfeature', async (interaction, bot) => {
    try {
      await lastValueFrom(module.create$(input));
      await replySuccess(bot, interaction, { description: 'Created!' });
    } catch (error) {
      await replyAutoError(bot, interaction, error, {
        duplicate: 'Already exists',
      });
    }
  });
}
```

#### 7. Define Command in JSON

```json
// adapters/discord/commands.json
[
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
]
```

#### 8. Register in Bootstrap

```typescript
// core/bootstrap/app.bootstrap.ts
export async function bootstrapApp(bot: Bot, rest: RestManager, prisma: PrismaClient) {
  await registerApplicationCommands(rest);
  
  // Setup features
  setupMyFeature(prisma, bot);
  
  commandRegistry.activate(bot);
}
```

### Development Checklist

- [ ] Prisma schema defined and migrated
- [ ] Module methods return `Observable<T>` using `from()`
- [ ] Service implements business logic
- [ ] Feature provides `cleanup()` function
- [ ] Command handler uses `replyAutoError`
- [ ] `commands.json` defines slash command structure
- [ ] Logger created with `createLogger()`
- [ ] Error handling covers common Discord API codes
- [ ] All public APIs have explicit types
- [ ] Complex logic has appropriate comments

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

| Issue | Cause | Solution |
|-------|-------|----------|
| Commands not appearing | Not registered or missing intents | Check `commands.json` + Bot Intents |
| Message content empty | MESSAGE CONTENT INTENT disabled | Enable in Discord Developer Portal |
| Database connection fails | Wrong DATABASE_URL | Check `.env` configuration |
| TypeScript paths not resolving | tsconfig-paths not loaded | Verify dev script uses `-r tsconfig-paths/register` |

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

## Feature Structure Guidelines

### Standard Directory Structure

```
features/[feature-name]/
├── [feature-name].feature.ts     # Feature entry point and event handling
├── [feature-name].module.ts      # Data access layer (Prisma operations)
├── [feature-name].service.ts     # Business logic layer (optional)
├── [feature-name].select.ts      # Prisma Runtime Selectors (optional)
├── [feature-name].types.ts       # Type definitions (minimal)
└── internal/                      # Internal utilities (minimal)
    └── helpers.ts               # Helper functions (only if needed)
```

### File Responsibilities

#### 1. `[feature-name].feature.ts`
- **Purpose**: Feature entry point, event listening, lifecycle management
- **Exports**: `setup[FeatureName]Feature` function
- **Dependencies**: PrismaClient, Bot, other Feature Modules
- **Pattern**: Create Module and Service, set up event listeners, return Feature object

```typescript
export function setupExampleFeature(
  prisma: PrismaClient,
  bot: Bot
): ExampleFeature {
  const module = createExampleModule(prisma);
  const service = createExampleService(module);
  
  // Set up event listeners
  
  return {
    name: 'example',
    module,
    service, // optional
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      log.info('Example feature cleaned up');
    },
  };
}
```

#### 2. `[feature-name].module.ts`
- **Purpose**: Data access layer, Observable wrapping, CRUD operations
- **Exports**: `create[FeatureName]Module` function and Module interface
- **Dependencies**: PrismaClient, Runtime Selectors
- **Pattern**: Wrap Prisma operations as Observables

```typescript
export function createExampleModule(prisma: PrismaClient): ExampleModule {
  return {
    getExamplesByGuild$(guildId: string): Observable<ExampleRuntime[]> {
      return from(prisma.example.findMany({ where: { guildId } }));
    },
    // ... other CRUD operations
  };
}
```

#### 3. `[feature-name].service.ts`
- **Purpose**: Business logic processing, complex calculations, cross-module coordination
- **Exports**: `create[FeatureName]Service` function and Service interface
- **Dependencies**: Module, other Services
- **Pattern**: Use lastValueFrom to handle Observables, implement business logic

#### 4. `[feature-name].select.ts`
- **Purpose**: Prisma Runtime Selectors, performance optimization
- **Exports**: Runtime Selector constants and Runtime types
- **Dependencies**: Prisma Client Types
- **Pattern**: Define query field selectors

#### 5. `internal/helpers.ts`
- **Purpose**: Helper functions, utility functions
- **Exports**: Various helper functions
- **Dependencies**: Basic utility libraries
- **Usage**: Only when absolutely necessary

### Design Principles

#### 1. Layered Architecture
- **Feature Layer**: Event handling and lifecycle management
- **Service Layer**: Business logic and cross-module coordination
- **Module Layer**: Data access and persistence

#### 2. Observable Pattern
- All Module methods return Observable
- Service layer uses lastValueFrom to convert to Promise
- Feature layer uses RxJS operators to handle event streams

#### 3. Dependency Injection
- Feature receives PrismaClient and Bot
- Service receives Module
- Module receives PrismaClient

#### 4. Consistency Standards
- **Naming**: Use `cleanup` method for cleanup (following Feature interface)
- **Interface**: All features extend `Feature` interface
- **Structure**: Minimal files, avoid unnecessary complexity
- **Types**: Keep type definitions minimal and focused

#### 5. Error Handling
- Module layer throws raw errors
- Service layer adds business context
- Feature layer handles and logs errors

### Best Practices

1. **Keep it Simple**: Don't add files unless absolutely necessary
2. **Maintain Consistency**: Follow the same patterns across all features
3. **Type Safety**: Use TypeScript strict mode and proper typing
4. **Observable First**: Leverage RxJS for async operations
5. **Test-Friendly**: Design interfaces and dependencies for easy testing

### Feature Examples

- **Guild**: Simple structure, no service layer
- **Keyword**: Standard structure with service
- **Member-Notify**: Standard structure with service
- **Reaction-Role**: Standard structure with internal helpers

***

**Happy Coding! 🎉**
