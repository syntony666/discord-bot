import type {
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import type { Resources } from './internal/resources';

export function createHelpers(resources: Resources) {
  return {
    get botId() {
      return resources.botId;
    },
    get botUser() {
      return resources.botUser;
    },

    sendMessage: (channelId: string, body: RESTPostAPIChannelMessageJSONBody) =>
      resources.channel(channelId).send(body),
    getChannel: (channelId: string) => resources.channel(channelId).get(),
    getMessage: (channelId: string, messageId: string) =>
      resources.channel(channelId).message(messageId).get(),
    editMessage: (
      channelId: string,
      messageId: string,
      body: RESTPatchAPIChannelMessageJSONBody
    ) => resources.channel(channelId).message(messageId).edit(body),
    deleteMessage: (channelId: string, messageId: string, reason?: string) =>
      resources.channel(channelId).message(messageId).delete(reason),

    addReaction: (channelId: string, messageId: string, emoji: string) =>
      resources.channel(channelId).message(messageId).reactions.add(emoji),
    removeReaction: (
      channelId: string,
      messageId: string,
      emoji: string,
      userId?: string
    ) =>
      resources
        .channel(channelId)
        .message(messageId)
        .reactions.remove(emoji, userId),

    getGuild: (guildId: string) => resources.guild(guildId).get(),
    getMember: (guildId: string, userId: string) =>
      resources.guild(guildId).member(userId).get(),
    addRole: (
      guildId: string,
      userId: string,
      roleId: string,
      reason?: string
    ) => resources.guild(guildId).member(userId).roles.add(roleId, reason),
    removeRole: (
      guildId: string,
      userId: string,
      roleId: string,
      reason?: string
    ) => resources.guild(guildId).member(userId).roles.remove(roleId, reason),

    getUser: (userId: string) => resources.user(userId).get(),
  };
}

export type DiscordHelpers = ReturnType<typeof createHelpers>;
