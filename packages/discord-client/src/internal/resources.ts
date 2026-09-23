import type { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type {
  APIChannel,
  APIGuild,
  APIGuildMember,
  APIInteractionResponse,
  APIMessage,
  APIUser,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody,
  RESTPutAPIApplicationCommandsJSONBody,
  RESTPutAPIApplicationCommandsResult,
} from 'discord-api-types/v10';

/** Discord's sentinel id for the original interaction response. */
export const ORIGINAL_MESSAGE = '@original';

const ownReactionRoute = (channelId: string, messageId: string, emoji: string) =>
  Routes.channelMessageOwnReaction(channelId, messageId, encodeURIComponent(emoji));

const userReactionRoute = (
  channelId: string,
  messageId: string,
  userId: string,
  emoji: string
) =>
  Routes.channelMessageUserReaction(
    channelId,
    messageId,
    encodeURIComponent(emoji),
    userId
  );

export function createResources(rest: REST, getBotUser: () => APIUser | null) {
  const channel = (channelId: string) => ({
    get: () => rest.get(Routes.channel(channelId)) as Promise<APIChannel>,
    send: (body: RESTPostAPIChannelMessageJSONBody) =>
      rest.post(Routes.channelMessages(channelId), {
        body,
      }) as Promise<APIMessage>,
    message: (messageId: string) => ({
      get: () =>
        rest.get(
          Routes.channelMessage(channelId, messageId)
        ) as Promise<APIMessage>,
      edit: (body: RESTPatchAPIChannelMessageJSONBody) =>
        rest.patch(Routes.channelMessage(channelId, messageId), {
          body,
        }) as Promise<APIMessage>,
      delete: (reason?: string) =>
        rest.delete(Routes.channelMessage(channelId, messageId), { reason }),
      reactions: {
        add: (emoji: string) =>
          rest.put(ownReactionRoute(channelId, messageId, emoji)),
        remove: (emoji: string, userId?: string) =>
          rest.delete(
            userId
              ? userReactionRoute(channelId, messageId, userId, emoji)
              : ownReactionRoute(channelId, messageId, emoji)
          ),
      },
    }),
  });

  const guild = (guildId: string) => ({
    get: () =>
      rest.get(`${Routes.guild(guildId)}?with_counts=true`) as Promise<APIGuild>,
    member: (userId: string) => ({
      get: () =>
        rest.get(Routes.guildMember(guildId, userId)) as Promise<APIGuildMember>,
      roles: {
        add: (roleId: string, reason?: string) =>
          rest.put(Routes.guildMemberRole(guildId, userId, roleId), { reason }),
        remove: (roleId: string, reason?: string) =>
          rest.delete(Routes.guildMemberRole(guildId, userId, roleId), {
            reason,
          }),
      },
    }),
  });

  const user = (userId: string) => ({
    get: () => rest.get(Routes.user(userId)) as Promise<APIUser>,
  });

  const interaction = (interactionId: string, token: string) => ({
    respond: (body: APIInteractionResponse) =>
      rest.post(Routes.interactionCallback(interactionId, token), { body }),
  });

  const webhook = (webhookId: string, token: string) => ({
    execute: (body: RESTPostAPIWebhookWithTokenJSONBody, wait = false) =>
      rest.post(Routes.webhook(webhookId, token), {
        body,
        ...(wait ? { query: new URLSearchParams({ wait: 'true' }) } : {}),
      }) as Promise<APIMessage | undefined>,
    message: (messageId: string) => ({
      edit: (body: RESTPatchAPIWebhookWithTokenMessageJSONBody) =>
        rest.patch(Routes.webhookMessage(webhookId, token, messageId), {
          body,
        }),
      delete: () => rest.delete(Routes.webhookMessage(webhookId, token, messageId)),
    }),
  });

  const application = (applicationId: string) => ({
    commands: {
      overwrite: (body: RESTPutAPIApplicationCommandsJSONBody) =>
        rest.put(Routes.applicationCommands(applicationId), {
          body,
        }) as Promise<RESTPutAPIApplicationCommandsResult>,
    },
  });

  return {
    get botId() {
      return getBotUser()?.id ?? '';
    },
    get botUser() {
      return getBotUser();
    },
    channel,
    guild,
    user,
    interaction,
    webhook,
    application,
  };
}

export type Resources = ReturnType<typeof createResources>;
