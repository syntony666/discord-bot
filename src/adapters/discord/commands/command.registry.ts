import { Bot } from '@discordeno/bot';
import { interactionCreate$ } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { Subscription } from 'rxjs';
import type { BotInteraction } from '@core/rx/bus';

const log = createLogger('CommandRegistry');

export type CommandHandler = (interaction: BotInteraction, bot: Bot) => void | Promise<void>;

class CommandRegistry {
  private commands = new Map<string, CommandHandler>();
  private customIdHandlers = new Map<string, CommandHandler>();
  private subscription?: Subscription;

  registerCommand(commandName: string, handler: CommandHandler): void {
    this.commands.set(commandName, handler);
    log.info({ commandName }, 'Command registered');
  }

  registerCustomIdHandler(prefix: string, handler: CommandHandler): void {
    this.customIdHandlers.set(prefix, handler);
    log.info({ prefix }, 'CustomId handler registered');
  }

  activate(bot: Bot): void {
    this.subscription = interactionCreate$.subscribe(async (interaction) => {
      try {
        if (interaction.data?.customId) {
          for (const [prefix, handler] of this.customIdHandlers.entries()) {
            if (interaction.data.customId.startsWith(prefix)) {
              await handler(interaction, bot);
              return;
            }
          }
        }

        if (interaction.type === 2 && interaction.data?.name) {
          const handler = this.commands.get(interaction.data.name);
          if (handler) {
            await handler(interaction, bot);
          }
        }
      } catch (error) {
        log.error({ error }, 'Error handling interaction');
      }
    });

    log.info(
      {
        commandCount: this.commands.size,
        customIdCount: this.customIdHandlers.size,
      },
      'Command registry activated'
    );
  }

  deactivate(): void {
    this.subscription?.unsubscribe();
    log.info('Command registry deactivated');
  }
}

export const commandRegistry = new CommandRegistry();
