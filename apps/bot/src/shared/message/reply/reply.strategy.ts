import { createLogger } from '@core/logger';
import { InteractionResponseType, InteractionType, MessageFlags } from 'discord-api-types/v10';
import type { MessageStrategy, ReplyStrategyOptions } from '../message.types';
import type { APIEmbed } from 'discord-api-types/v10';
import { appConfig } from '@core/config';

const log = createLogger('ReplyStrategy');

export class ReplyStrategy implements MessageStrategy {
  constructor(private readonly options: ReplyStrategyOptions) {}

  async send(): Promise<boolean> {
    const {
      actions,
      interaction,
      color,
      ephemeral = false,
      isEdit = false,
      components,
      // Extract all APIEmbed properties
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
      const embed: APIEmbed = {
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
          text: interaction.user?.username ?? '',
          icon_url: appConfig.footerIconUrl,
        },
      };

      if (isEdit) {
        const isComponentInteraction = interaction.type === InteractionType.MessageComponent;
        const isModalInteraction = interaction.type === InteractionType.ModalSubmit;

        if (isComponentInteraction || isModalInteraction) {
          // Update the message that triggered the interaction
          // When editing, remove buttons unless explicitly provided
          await actions.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseType.UpdateMessage,
            data: {
              embeds: [embed],
              components: components ?? [], // Clear components by default when editing
            },
          });
        } else {
          // Update bot's own original response
          await actions.editOriginalInteractionResponse(interaction.token, {
            embeds: [embed],
            components: components ?? [], // Clear components by default when editing
          });
        }
      } else {
        await actions.sendInteractionResponse(interaction.id, interaction.token, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [embed],
            components,
            flags: ephemeral ? MessageFlags.Ephemeral : undefined,
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
