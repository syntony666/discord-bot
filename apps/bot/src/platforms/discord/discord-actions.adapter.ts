import type {
  APIGuild,
  APIMessage,
  APIUser,
} from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import type { DiscordClient } from '@discord-bot/discord-client';
import type { DiscordActions } from '@core/discord/discord-actions';
import type { BotGuild, BotUser } from '@core/rx/bus';

export interface DiscordActionsHandle {
  actions: DiscordActions;
  setBotId(id: string): void;
}

export function createDiscordActions(
  client: DiscordClient,
  applicationId: string
): DiscordActionsHandle {
  const rest = client.rest;
  let botId = '';

  const actions: DiscordActions = {
    get botId() {
      return botId;
    },
    sendMessage: (channelId, content) =>
      rest.post(Routes.channelMessages(channelId), {
        body: content,
      }) as Promise<APIMessage>,
    sendInteractionResponse: (id, token, response) =>
      rest.post(Routes.interactionCallback(id, token), { body: response }),
    editOriginalInteractionResponse: (token, data) =>
      rest.patch(Routes.webhookMessage(applicationId, token, '@original'), { body: data }),
    editMessage: (channelId, messageId, options) =>
      rest.patch(Routes.channelMessage(channelId, messageId), {
        body: options,
      }),
    deleteMessage: (channelId, messageId, reason) =>
      rest.delete(Routes.channelMessage(channelId, messageId), { reason }),
    getGuild: (guildId) =>
      rest.get(`${Routes.guild(guildId)}?with_counts=true`) as Promise<BotGuild>,
    getUser: (userId) => rest.get(Routes.user(userId)) as Promise<BotUser>,
    addRole: (guildId, userId, roleId, reason) =>
      rest.put(Routes.guildMemberRole(guildId, userId, roleId), {
        reason,
      }),
    removeRole: (guildId, userId, roleId, reason) =>
      rest.delete(Routes.guildMemberRole(guildId, userId, roleId), {
        reason,
      }),
    addReaction: (channelId, messageId, emoji) =>
      rest.put(
        Routes.channelMessageOwnReaction(
          channelId,
          messageId,
          encodeURIComponent(emoji)
        )
      ),
    deleteOwnReaction: (channelId, messageId, emoji) =>
      rest.delete(
        Routes.channelMessageOwnReaction(
          channelId,
          messageId,
          encodeURIComponent(emoji)
        )
      ),
    deleteUserReaction: (channelId, messageId, userId, emoji) =>
      rest.delete(
        Routes.channelMessageUserReaction(
          channelId,
          messageId,
          encodeURIComponent(emoji),
          userId
        )
      ),
  };

  return {
    actions,
    setBotId: (id) => {
      botId = id;
    },
  };
}
