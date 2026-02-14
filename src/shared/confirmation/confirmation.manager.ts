import { Bot, MessageComponents } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { BaseColors } from '@core/config/colors.config';
import { appConfig } from '@core/config';
import { StoredConfirmation, ConfirmationConfig, ConfirmationHandler } from './confirmation.types';
import { replyWarning } from 'shared/message/message.helper';
import { PendingState } from './states/pending.state';
import { ExpiredState } from './states/expired.state';
import { CompletedState } from './states/completed.state';

const log = createLogger('ConfirmationManager');

export class ConfirmationManager {
  private confirmations = new Map<string, StoredConfirmation>();
  private states = new Map<string, any>(); // Store current state for each confirmation
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  async createConfirmation<TData = any>(
    bot: Bot,
    interaction: BotInteraction,
    config: ConfirmationConfig<TData>,
    handler: ConfirmationHandler<TData>
  ): Promise<string> {
    const confirmationId = this.generateConfirmationId(
      config.confirmationType,
      config.guildId,
      config.userId
    );

    const expiresIn = config.expiresIn ?? 2 * 60 * 1000;
    const expiresAt = Date.now() + expiresIn;

    const stored: StoredConfirmation = {
      confirmationType: config.confirmationType,
      userId: config.userId,
      guildId: config.guildId,
      data: config.data,
      expiresAt,
      handler,
    };

    this.confirmations.set(confirmationId, stored);
    this.states.set(confirmationId, new PendingState()); // Set initial state

    const footerText = config.embed.footerText
      ? `${config.embed.footerText}\n此確認訊息將在 ${Math.floor(expiresIn / 60000)} 分鐘後失效`
      : `此確認訊息將在 ${Math.floor(expiresIn / 60000)} 分鐘後失效`;

    const buttons = config.buttons ?? {};
    const components: MessageComponents = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: buttons.confirmStyle ?? 3,
            label: buttons.confirmLabel ?? '確認',
            customId: `confirm:${confirmationId}:confirm`,
          },
          {
            type: 2,
            style: buttons.cancelStyle ?? 2,
            label: buttons.cancelLabel ?? '取消',
            customId: `confirm:${confirmationId}:cancel`,
          },
        ],
      },
    ];

    // Use messageHelper with warning style for confirmations
    await replyWarning(bot, interaction, {
      ...config.embed,
      color: config.embed.color ?? BaseColors.ORANGE,
      footer: {
        text: footerText,
        icon_url: appConfig.footerIconUrl,
      },
      components,
    });

    log.info(
      { confirmationId, type: config.confirmationType, userId: config.userId },
      'Confirmation created'
    );

    return confirmationId;
  }

  async handle(bot: Bot, interaction: BotInteraction): Promise<void> {
    const customId = interaction.data?.customId || '';
    const match = customId.match(/^confirm:(.+):(confirm|cancel)$/);

    if (!match) {
      log.warn({ customId }, 'Invalid confirmation customId pattern');
      return;
    }

    const confirmationId = match[1] as string;
    const action = match[2];

    const stored = this.confirmations.get(confirmationId);

    if (!stored) {
      // Use expired state for missing confirmations
      const expiredState = new ExpiredState();
      await expiredState.unauthorized(stored!, bot, interaction);
      return;
    }

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      this.transitionToState(confirmationId, new ExpiredState());
      const state = this.states.get(confirmationId);
      await state.expire(stored);
      this.confirmations.delete(confirmationId);
      this.states.delete(confirmationId);
      return;
    }

    // Check user authorization
    const currentUserId = interaction.user?.id?.toString() || '';
    if (currentUserId !== stored.userId) {
      const state = this.states.get(confirmationId);
      await state.unauthorized(stored, bot, interaction);
      return;
    }

    // Handle action based on current state
    const state = this.states.get(confirmationId);

    if (action === 'cancel') {
      await state.cancel(stored, bot, interaction);
    } else if (action === 'confirm') {
      await state.confirm(stored, bot, interaction);
    }

    // Transition to completed state
    this.transitionToState(confirmationId, new CompletedState());
    this.confirmations.delete(confirmationId);
    this.states.delete(confirmationId);
  }

  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, stored] of this.confirmations.entries()) {
      if (now > stored.expiresAt) {
        this.transitionToState(id, new ExpiredState());
        const state = this.states.get(id);
        state.expire(stored);
        this.confirmations.delete(id);
        this.states.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.debug({ cleanedCount }, 'Cleaned up expired confirmations');
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private generateConfirmationId(type: string, guildId: string, userId: string): string {
    return `${type}:${guildId}:${userId}:${Date.now()}`;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 1000);
  }

  private transitionToState(confirmationId: string, newState: any): void {
    const oldState = this.states.get(confirmationId);
    if (oldState) {
      // Could add transition logging here if needed
    }
    this.states.set(confirmationId, newState);
  }
}
