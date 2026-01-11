import { createLogger } from '@core/logger';
import type { MessageStrategy, ReplyStrategyOptions } from '../message.types';
import type { DiscordEmbed } from '@discordeno/bot';
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
      color,
      ephemeral = false,
      isEdit = false,
      components,
      // Extract all DiscordEmbed properties
      title,
      description,
      fields,
      thumbnail,
      image,
      footer,
      author,
      url,
      video,
      provider,
    } = this.options;

    try {
      const embed: DiscordEmbed = {
        title,
        description,
        color,
        fields,
        thumbnail,
        image,
        author,
        url,
        video,
        provider,
        timestamp: new Date().toISOString(),
        footer: footer ?? {
          text: interaction.user.username,
          icon_url: appConfig.footerIconUrl,
        },
      };

      if (isEdit) {
        const isComponentInteraction = interaction.type === 3; // MESSAGE_COMPONENT
        const isModalInteraction = interaction.type === 5; // MODAL_SUBMIT

        if (isComponentInteraction || isModalInteraction) {
          // Use type: 7 to update the message that triggered the interaction
          // When editing, remove buttons unless explicitly provided
          await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: 7, // UPDATE_MESSAGE
            data: {
              embeds: [embed],
              components: components ?? [], // Clear components by default when editing
            },
          });
        } else {
          // Use editOriginalInteractionResponse to update bot's own response
          await bot.helpers.editOriginalInteractionResponse(interaction.token, {
            embeds: [embed],
            components: components ?? [], // Clear components by default when editing
          });
        }
      } else {
        // Original reply logic for non-edit cases
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE or CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            embeds: [embed],
            components,
            flags: ephemeral ? 64 : undefined,
          },
        });
      }

      return true;
    } catch (error) {
      log.error({ error, interactionId: interaction.id }, 'Failed to send reply');
      return false;
    }
  }
}
