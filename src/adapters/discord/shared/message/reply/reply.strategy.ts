import { createLogger } from '@core/logger';
import type { MessageStrategy, ReplyStrategyOptions } from '../message.types';
import type { DiscordEmbed, MessageComponents } from '@discordeno/bot';
import { appConfig } from '@core/config';

const log = createLogger('ReplyStrategy');

/**
 * Strategy for sending interaction replies with a single embed.
 */
export class ReplyStrategy implements MessageStrategy {
  constructor(private readonly options: ReplyStrategyOptions) {}

  async send(): Promise<boolean> {
    const {
      bot,
      interaction,
      title,
      description,
      color,
      ephemeral = false,
      fields,
      components,
    } = this.options;

    try {
      const embed: DiscordEmbed = {
        title,
        description,
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: interaction.user.username,
          icon_url: appConfig.footerIconUrl,
        },
      };

      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: 4,
        data: {
          embeds: [embed],
          components,
          flags: ephemeral ? 64 : undefined,
        },
      });

      return true;
    } catch (error) {
      log.error({ error, interactionId: interaction.id }, 'Failed to send reply');
      return false;
    }
  }
}
