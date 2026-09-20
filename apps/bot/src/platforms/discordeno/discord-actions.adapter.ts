import type { DiscordActions } from '@core/discord/discord-actions';
import type { BotGuild, BotUser } from '@core/rx/bus';
import type { APIMessage } from 'discord-api-types/v10';
import type { createBotClient } from './bot.client';
import {
  toCreateMessageOptions,
  toEditMessageOptions,
  toInteractionResponse,
  toInteractionCallbackData,
} from './payload.mapper';

type RuntimeBot = ReturnType<typeof createBotClient>['bot'];

export function createDiscordActions(bot: RuntimeBot): DiscordActions {
  const helpers = bot.helpers;
  return {
    botId: String(bot.id),
    sendMessage: (channelId, content) =>
      helpers.sendMessage(
        BigInt(channelId),
        toCreateMessageOptions(content)
      ) as unknown as Promise<APIMessage>,
    sendInteractionResponse: (id, token, response) =>
      helpers.sendInteractionResponse(BigInt(id), token, toInteractionResponse(response)),
    editOriginalInteractionResponse: (token, data) =>
      helpers.editOriginalInteractionResponse(token, toInteractionCallbackData(data)),
    editMessage: (channelId, messageId, options) =>
      helpers.editMessage(BigInt(channelId), BigInt(messageId), toEditMessageOptions(options)),
    deleteMessage: (channelId, messageId, reason) =>
      helpers.deleteMessage(BigInt(channelId), BigInt(messageId), reason),
    getGuild: (guildId) => helpers.getGuild(BigInt(guildId)) as Promise<BotGuild>,
    getUser: (userId) => helpers.getUser(BigInt(userId)) as Promise<BotUser>,
    addRole: (guildId, userId, roleId, reason) =>
      helpers.addRole(BigInt(guildId), BigInt(userId), BigInt(roleId), reason),
    removeRole: (guildId, userId, roleId, reason) =>
      helpers.removeRole(BigInt(guildId), BigInt(userId), BigInt(roleId), reason),
    addReaction: (channelId, messageId, emoji) =>
      helpers.addReaction(BigInt(channelId), BigInt(messageId), emoji),
    deleteOwnReaction: (channelId, messageId, emoji) =>
      helpers.deleteOwnReaction(BigInt(channelId), BigInt(messageId), emoji),
    deleteUserReaction: (channelId, messageId, userId, emoji) =>
      helpers.deleteUserReaction(BigInt(channelId), BigInt(messageId), BigInt(userId), emoji),
  };
}
