import type {
  CreateMessageOptions,
  EditMessage,
  InteractionCallbackData,
  InteractionResponse,
  MessageComponents,
} from '@discordeno/bot';
import { ComponentType } from 'discord-api-types/v10';
import type {
  APIAllowedMentions,
  APIComponentInActionRow,
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIMessageTopLevelComponent,
  APIActionRowComponent,
  APIComponentInModalActionRow,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';

function toAllowedMentions(mentions?: APIAllowedMentions | null) {
  if (!mentions) return undefined;
  return {
    parse: mentions.parse,
    users: mentions.users?.map(BigInt),
    roles: mentions.roles?.map(BigInt),
    repliedUser: mentions.replied_user,
  };
}

function toComponent(component: APIComponentInActionRow): Record<string, unknown> {
  switch (component.type) {
    case ComponentType.Button:
      return {
        type: component.type,
        label: 'label' in component ? component.label : undefined,
        style: component.style,
        customId: 'custom_id' in component ? component.custom_id : undefined,
        url: 'url' in component ? component.url : undefined,
        disabled: component.disabled,
        emoji:
          'emoji' in component && component.emoji
            ? {
                id: component.emoji.id ? BigInt(component.emoji.id) : undefined,
                name: component.emoji.name,
                animated: component.emoji.animated,
              }
            : undefined,
      };
    case ComponentType.TextInput:
      return {
        type: component.type,
        customId: component.custom_id,
        style: component.style,
        label: component.label,
        required: component.required,
        placeholder: component.placeholder,
        minLength: component.min_length,
        maxLength: component.max_length,
        value: component.value,
      };
    default:
      return { ...component, customId: 'custom_id' in component ? component.custom_id : undefined };
  }
}

type AnyComponentRow =
  | APIActionRowComponent<APIComponentInActionRow>
  | APIActionRowComponent<APIComponentInModalActionRow>
  | APIMessageTopLevelComponent;

export function toComponents(
  rows?: readonly AnyComponentRow[] | null
): MessageComponents | undefined {
  return rows?.map((row) => {
    if (row.type !== ComponentType.ActionRow) return row;
    return {
      type: row.type,
      components: (row.components as APIComponentInActionRow[]).map(toComponent),
    };
  }) as MessageComponents | undefined;
}

export function toInteractionCallbackData(
  data: APIInteractionResponseCallbackData
): InteractionCallbackData {
  const { allowed_mentions, components, custom_id, ...rest } = data as {
    allowed_mentions?: APIAllowedMentions;
    components?: AnyComponentRow[];
    custom_id?: string;
  };
  return {
    ...rest,
    allowedMentions: toAllowedMentions(allowed_mentions),
    components: toComponents(components),
    customId: custom_id,
  } as InteractionCallbackData;
}

export function toInteractionResponse(response: APIInteractionResponse): InteractionResponse {
  const data = 'data' in response ? response.data : undefined;
  return {
    type: response.type,
    data: data ? toInteractionCallbackData(data as APIInteractionResponseCallbackData) : undefined,
  } as unknown as InteractionResponse;
}

export function toCreateMessageOptions(
  message: RESTPostAPIChannelMessageJSONBody
): CreateMessageOptions {
  const { allowed_mentions, components, message_reference, sticker_ids, ...rest } = message;
  return {
    ...rest,
    allowedMentions: toAllowedMentions(allowed_mentions),
    components: toComponents(components),
    messageReference: message_reference && {
      messageId: BigInt(message_reference.message_id),
      channelId: message_reference.channel_id ? BigInt(message_reference.channel_id) : undefined,
      guildId: message_reference.guild_id ? BigInt(message_reference.guild_id) : undefined,
      failIfNotExists: message_reference.fail_if_not_exists,
    },
    stickerIds: sticker_ids?.map(BigInt),
  } as CreateMessageOptions;
}

export function toEditMessageOptions(message: RESTPatchAPIChannelMessageJSONBody): EditMessage {
  const { allowed_mentions, components, ...rest } = message;
  return {
    ...rest,
    allowedMentions: toAllowedMentions(allowed_mentions),
    components: toComponents(components),
  } as EditMessage;
}
