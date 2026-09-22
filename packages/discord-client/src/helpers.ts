import type {
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import type { Entities } from './entities';

export function createHelpers(entities: Entities) {
  return {
    get botId() {
      return entities.botId;
    },
    get botUser() {
      return entities.botUser;
    },

    sendMessage: (channelId: string, body: RESTPostAPIChannelMessageJSONBody) =>
      entities.channel(channelId).send(body),
    getChannel: (channelId: string) => entities.channel(channelId).get(),
    getMessage: (channelId: string, messageId: string) =>
      entities.channel(channelId).message(messageId).get(),
    editMessage: (
      channelId: string,
      messageId: string,
      body: RESTPatchAPIChannelMessageJSONBody
    ) => entities.channel(channelId).message(messageId).edit(body),
    deleteMessage: (channelId: string, messageId: string, reason?: string) =>
      entities.channel(channelId).message(messageId).delete(reason),

    addReaction: (channelId: string, messageId: string, emoji: string) =>
      entities.channel(channelId).message(messageId).reactions.add(emoji),
    removeReaction: (
      channelId: string,
      messageId: string,
      emoji: string,
      userId?: string
    ) =>
      entities
        .channel(channelId)
        .message(messageId)
        .reactions.remove(emoji, userId),

    getGuild: (guildId: string) => entities.guild(guildId).get(),
    getMember: (guildId: string, userId: string) =>
      entities.guild(guildId).member(userId).get(),
    addRole: (
      guildId: string,
      userId: string,
      roleId: string,
      reason?: string
    ) => entities.guild(guildId).member(userId).roles.add(roleId, reason),
    removeRole: (
      guildId: string,
      userId: string,
      roleId: string,
      reason?: string
    ) => entities.guild(guildId).member(userId).roles.remove(roleId, reason),

    getUser: (userId: string) => entities.user(userId).get(),
  };
}

export type DiscordHelpers = ReturnType<typeof createHelpers>;
