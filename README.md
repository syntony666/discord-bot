# Discord Bot (TypeScript + Discordeno + RxJS + Prisma)

A modular **TypeScript / Discordeno / RxJS / Prisma / PostgreSQL / pino** Discord bot featuring an Observable-based event pipeline and a clean, layered architecture. Designed for scalability and maintainability.

## ✨ Features

### 🔑 Keyword Auto-Reply System
- **Two Match Modes**:
  - `EXACT`: Matches trimmed message content exactly
  - `CONTAINS`: Matches if message contains the pattern
- **Per-Guild Configuration**: Each server maintains independent keyword rules
- **Database Persistence**: Rules stored in PostgreSQL with Prisma ORM
- **Smart Caching**: In-memory cache for optimal performance
- **Management Commands**:
  - `/keyword add` - Add new keyword rules with optional match type (defaults to EXACT)
  - `/keyword list` - View all rules with interactive pagination
  - `/keyword delete` - Remove keyword rules by pattern

### 📄 Advanced Paginator System
- **Reusable Component**: Generic paginator for any data type
- **Interactive Buttons**:
  - Previous/Next navigation with smart enable/disable
  - Page indicator button with **jump-to-page modal** functionality
- **Button Styles**: Primary (blue) for navigation, Success (green) for page jumps
- **Session Management**: 30-second TTL with automatic cleanup
- **Strategy Pattern**: Custom `PageRenderer<T>` for flexible page rendering
- **User Permissions**: Only the command initiator can control the paginator

### 🎨 Message System
- **Unified Message Interface**: Factory pattern for consistent message handling
- **Reply Types**:
  - Success (green)
  - Error (red)
  - Info (Discord blurple)
  - Warning (yellow)
- **Auto Error Handling**: Automatic Prisma and Discord error translation
- **Notification Support**: Channel notifications for various event types

### 🏗️ Architecture Highlights
- **Reactive Programming**: RxJS-based event pipeline for `messageCreate$` and `interactionCreate$`
- **Dependency Inversion**: Services depend on Observable interfaces, not concrete implementations
- **Modular Design**: Clean separation between core, platforms, features, and adapters
- **Type Safety**: Strict TypeScript with `exactOptionalPropertyTypes`
- **Graceful Shutdown**: Proper SIGINT/SIGTERM handling for database cleanup

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Discord SDK**: Discordeno v21 (`@discordeno/bot`, `@discordeno/rest`)
- **Reactive**: RxJS 7.8+
- **ORM / Database**: Prisma + PostgreSQL
- **Logging**: pino (with pino-pretty for development)
- **Configuration**: dotenv

## 📁 Project Structure

```
src/
  core/
    config/
      app.config.ts           # Application configuration
      discord.config.ts       # Discord-specific config
    logger.ts                 # pino logger setup
    rx/
      bus.ts                  # RxJS event bus (messageCreate$, interactionCreate$, ready$)
    signals/
      signal.ts               # Simple signal implementation for state management
    bootstrap/
      app.bootstrap.ts        # Application initialization

  platforms/
    discordeno/
      bot.client.ts           # createBot + events → RxJS Observables
      commands-loader.ts      # Auto-register slash commands from commands.json
    database/
      prisma.client.ts        # PrismaClient singleton + connection management

  features/
    keyword/
      keyword.feature.ts      # Feature setup and message handler
      keyword.module.ts       # Prisma CRUD operations as Observables
      keyword.service.ts      # Business logic: EXACT/CONTAINS matching + caching

  adapters/
    discord/
      commands/
        command.registry.ts   # Command router with customId support
        keyword.command.ts    # /keyword slash command handlers
      shared/
        message/
          message.factory.ts  # Strategy pattern message factory
          message.helper.ts   # Convenience functions for replies/notifications
          message.types.ts    # Message type definitions
          reply/              # Reply strategy implementations
          notification/       # Notification strategy implementations
        paginator/
          core/
            paginator.actions.ts     # Action parsing (prev/page/next)
            paginator.repository.ts  # In-memory session storage
            paginator.state.ts       # State machine reducer
          renderer/
            renderer.interface.ts    # PageRenderer<T> interface
            text-list.renderer.ts    # Text list rendering implementation
            image-list.renderer.ts   # Image list rendering implementation
            custom.renderer.ts       # Custom renderer utilities
          strategy/
            paginator-button.strategy.ts  # Button interaction handling + jump-to-page modal
          ui/
            paginator.ui.ts          # UI component builders
          paginator.factory.ts       # Paginator creation factory
          paginator.helper.ts        # Convenience wrapper functions
          paginator.types.ts         # Type definitions
      commands.json           # Slash command definitions (JSON schema)
```

## 🚀 Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

```bash
# Initialize Prisma (creates prisma/schema.prisma and .env)
npx prisma init --datasource-provider postgresql
```

### 3. Configure Environment

Create `.env` in project root:

```env
NODE_ENV=development
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-application-id
DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
```

**Important**: Enable **MESSAGE CONTENT INTENT** in the [Discord Developer Portal](https://discord.com/developers/applications).

### 4. Database Migration

```bash
# Push schema to database
npm run prisma:init

# Or create migrations
npm run prisma:migrate
```

### 5. Run Development Server

```bash
npm run dev
```

Uses `ts-node-dev` with hot reload and `tsconfig-paths` for path aliases.

### 6. Production Build

```bash
npm run build
npm start
```

## 📊 Database Schema

### KeywordRule

```prisma
model KeywordRule {
  guildId   String
  pattern   String
  matchType KeywordMatchType
  response  String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@id([guildId, pattern])
}

enum KeywordMatchType {
  EXACT
  CONTAINS
}
```

**Composite Primary Key**: `(guildId, pattern)` ensures unique patterns per guild.

## 🎯 Usage Examples

### Keyword Commands

```bash
# Add keyword with exact match (default)
/keyword add pattern:hello response:Hi there!

# Add keyword with contains match
/keyword add pattern:hello match_type:CONTAINS response:Hello!

# List all keywords (with pagination)
/keyword list

# Delete keyword
/keyword delete pattern:hello
```

### Paginator Jump Feature

1. Click the middle page button (green)
2. Enter desired page number in the modal
3. Paginator jumps to specified page immediately

## 🔄 Event Flow

### Message Event Flow
```
Discord messageCreate
  → bot.events.messageCreate
  → messageCreate$ (RxJS Subject)
  → MessageHandler subscription
  → KeywordService.findMatch$
  → bot.helpers.sendMessage()
```

### Interaction Event Flow
```
Discord interaction
  → bot.events.interactionCreate
  → interactionCreate$ (RxJS Subject)
  → CommandRegistry
  → Route by customId or command name
  → Handler execution
  → sendInteractionResponse()
```

## 🎨 Design Patterns

- **Observer Pattern**: RxJS Subjects for event distribution
- **Factory Pattern**: Message factory for unified message handling
- **Strategy Pattern**: PageRenderer for flexible pagination rendering
- **Repository Pattern**: PaginatorSessionRepository for session management
- **State Machine**: `reducePaginatorState` for paginator state transitions
- **Dependency Injection**: Manual DI through factory functions

## 🧪 Code Conventions

- **Observables for I/O**: All Discord events and DB operations use RxJS Observables
- **Feature Isolation**: Features expose Observable-based interfaces, hiding implementation details
- **Centralized Logging**: All modules use `createLogger(scope)` from `@core/logger`
- **Type Safety**: Leverage TypeScript's strict mode and avoid `any` where possible
- **Error Handling**: Use `autoErrorReply` for automatic error translation

## 📝 Available Scripts

```bash
npm run dev              # Development with hot reload
npm run build            # Production build
npm start                # Run production build
npm run prisma:init      # Push Prisma schema to database
npm run prisma:migrate   # Create and apply migrations
npm run prisma:deploy    # Deploy migrations (production)
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
```

## 🔮 Future Enhancements

### Potential Features
- Role assignment via button interactions
- Twitch integration for live stream notifications
- Advanced keyword features:
  - Regular expression support
  - Keyword usage statistics
  - Bulk import/export
  - Permission-based management
- Multi-language support
- Scheduled tasks and reminders
- Custom event listeners

## 📜 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [Discordeno](https://discordeno.js.org/) - High-performance Discord SDK
- [RxJS](https://rxjs.dev/) - Reactive programming library
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [pino](https://getpino.io/) - Fast JSON logger

---

**Note**: This bot demonstrates clean architecture principles and is production-ready for medium to large-scale Discord bots.
