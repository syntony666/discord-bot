import { Bot, MessageComponents } from '@discordeno/bot';
import { BotInteraction } from '@core/rx/bus';
import { createLogger } from '@core/logger';
import { BaseColors } from '@core/config/colors.config';
import { appConfig } from '@core/config';
import { StoredConfirmation, ConfirmationConfig, ConfirmationHandler } from './confirmation.types';

const log = createLogger('ConfirmationManager');

/**
 * Manages confirmation workflows with button interactions.
 * Handles storage, expiration, and user authorization checks.
 */
export class ConfirmationManager {
  private confirmations = new Map<string, StoredConfirmation>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Create a confirmation request and send it to the user.
   *
   * @returns Unique confirmation ID for tracking
   */
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

    this.confirmations.set(confirmationId, {
      confirmationType: config.confirmationType,
      userId: config.userId,
      guildId: config.guildId,
      data: config.data,
      expiresAt,
      handler,
    });

    const footerText = config.embed.footerText
      ? `${config.embed.footerText}\n此確認訊息將在 ${Math.floor(expiresIn / 60000)} 分鐘後失效`
      : `此確認訊息將在 ${Math.floor(expiresIn / 60000)} 分鐘後失效`;

    const embed = {
      color: config.embed.color ?? BaseColors.ORANGE,
      title: config.embed.title,
      description: config.embed.description,
      fields: config.embed.fields ?? [],
      timestamp: new Date().toISOString(),
      footer: {
        text: footerText,
        icon_url: appConfig.footerIconUrl,
      },
    };

    const buttons = config.buttons ?? {};
    const components = [
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
    ] as MessageComponents;

    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [embed],
        components,
      },
    });

    log.info(
      { confirmationId, type: config.confirmationType, userId: config.userId },
      'Confirmation created'
    );

    return confirmationId;
  }

  /**
   * Handle button interaction for confirmations.
   * Validates expiration and user authorization before executing handlers.
   */
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
      await this.sendExpiredMessage(bot, interaction);
      return;
    }

    if (Date.now() > stored.expiresAt) {
      this.confirmations.delete(confirmationId);
      await this.sendExpiredMessage(bot, interaction);
      return;
    }

    // Only the user who initiated the confirmation can interact with it
    const currentUserId = interaction.user?.id?.toString() || '';
    if (currentUserId !== stored.userId) {
      await this.sendUnauthorizedMessage(bot, interaction);
      return;
    }

    if (action === 'cancel') {
      await this.handleCancel(bot, interaction, stored);
    } else if (action === 'confirm') {
      await this.handleConfirm(bot, interaction, stored);
    }

    this.confirmations.delete(confirmationId);
  }

  /**
   * Clean up expired confirmations.
   * Called automatically every 30 seconds.
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, stored] of this.confirmations.entries()) {
      if (now > stored.expiresAt) {
        if (stored.handler.onExpire) {
          stored.handler.onExpire(id, stored.data);
        }
        this.confirmations.delete(id);
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

  private async handleConfirm(
    bot: Bot,
    interaction: BotInteraction,
    stored: StoredConfirmation
  ): Promise<void> {
    try {
      await stored.handler.onConfirm(bot, interaction, stored.data);
    } catch (error) {
      log.error(
        { error, confirmationType: stored.confirmationType },
        'Confirmation handler failed'
      );
    }
  }

  private async handleCancel(
    bot: Bot,
    interaction: BotInteraction,
    stored: StoredConfirmation
  ): Promise<void> {
    if (stored.handler.onCancel) {
      try {
        await stored.handler.onCancel(bot, interaction, stored.data);
      } catch (error) {
        log.error({ error, confirmationType: stored.confirmationType }, 'Cancel handler failed');
      }
    } else {
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 7,
        data: {
          embeds: [
            {
              color: BaseColors.GRAY,
              title: '已取消',
              description: '操作已取消。',
              timestamp: new Date().toISOString(),
              footer: {
                text: interaction.user?.username || 'Unknown User',
                iconUrl: appConfig.footerIconUrl,
              },
            },
          ],
          components: [],
        },
      });
    }
  }

  private async sendExpiredMessage(bot: Bot, interaction: BotInteraction): Promise<void> {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '確認已過期',
            description: '此確認請求已過期或已被處理,請重新執行指令。',
            timestamp: new Date().toISOString(),
            footer: {
              text: interaction.user?.username || 'Unknown User',
              iconUrl: appConfig.footerIconUrl,
            },
          },
        ],
        components: [],
        flags: 64,
      },
    });
  }

  private async sendUnauthorizedMessage(bot: Bot, interaction: BotInteraction): Promise<void> {
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: 4,
      data: {
        embeds: [
          {
            color: BaseColors.RED,
            title: '權限不足',
            description: '只有發起此操作的用戶可以確認或取消。',
            timestamp: new Date().toISOString(),
            footer: {
              text: interaction.user?.username || 'Unknown User',
              iconUrl: appConfig.footerIconUrl,
            },
          },
        ],
        flags: 64,
      },
    });
  }
}
