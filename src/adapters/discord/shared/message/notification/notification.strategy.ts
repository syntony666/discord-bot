import { createLogger } from '@core/logger';
import type { MessageStrategy, NotificationStrategyOptions } from '../message.types';

const log = createLogger('NotificationStrategy');

/**
 * Strategy for sending rich notifications to a channel.
 * Used for non-interaction messages (e.g. stream alerts).
 */
export class NotificationStrategy implements MessageStrategy {
  constructor(private readonly options: NotificationStrategyOptions) {}

  async send(): Promise<boolean> {
    const { bot, channelId, title, description, color, fields, thumbnail, image, footer } =
      this.options;

    try {
      await bot.helpers.sendMessage(channelId, {
        embeds: [
          {
            title,
            description,
            color,
            fields,
            thumbnail: thumbnail ? { url: thumbnail } : undefined,
            image: image ? { url: image } : undefined,
            footer,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return true;
    } catch (error) {
      log.error({ error, channelId }, 'Failed to send notification');
      return false;
    }
  }
}
