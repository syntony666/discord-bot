import type { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type {
  APIGuild,
  APIMessage,
  APIUser,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';

export interface DiscordActions {
  readonly botId: string;
  readonly botUser: APIUser | null;
  sendMessage(
    channelId: string,
    content: RESTPostAPIChannelMessageJSONBody
  ): Promise<APIMessage>;
  editMessage(
    channelId: string,
    messageId: string,
    options: RESTPatchAPIChannelMessageJSONBody
  ): Promise<APIMessage>;
  deleteMessage(
    channelId: string,
    messageId: string,
    reason?: string
  ): Promise<void>;
  getGuild(guildId: string): Promise<APIGuild>;
  getUser(userId: string): Promise<APIUser>;
  addRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<void>;
  removeRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<void>;
  addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
  deleteOwnReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void>;
  deleteUserReaction(
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void>;
}

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

export function createDiscordActions(
  rest: REST,
  getBotUser: () => APIUser | null
): DiscordActions {
  return {
    get botId() {
      return getBotUser()?.id ?? '';
    },
    get botUser() {
      return getBotUser();
    },
    sendMessage: (channelId, content) =>
      rest.post(Routes.channelMessages(channelId), {
        body: content,
      }) as Promise<APIMessage>,
    editMessage: (channelId, messageId, options) =>
      rest.patch(Routes.channelMessage(channelId, messageId), {
        body: options,
      }) as Promise<APIMessage>,
    deleteMessage: async (channelId, messageId, reason) => {
      await rest.delete(Routes.channelMessage(channelId, messageId), { reason });
    },
    getGuild: (guildId) =>
      rest.get(`${Routes.guild(guildId)}?with_counts=true`) as Promise<APIGuild>,
    getUser: (userId) => rest.get(Routes.user(userId)) as Promise<APIUser>,
    addRole: async (guildId, userId, roleId, reason) => {
      await rest.put(Routes.guildMemberRole(guildId, userId, roleId), { reason });
    },
    removeRole: async (guildId, userId, roleId, reason) => {
      await rest.delete(Routes.guildMemberRole(guildId, userId, roleId), {
        reason,
      });
    },
    addReaction: async (channelId, messageId, emoji) => {
      await rest.put(ownReactionRoute(channelId, messageId, emoji));
    },
    deleteOwnReaction: async (channelId, messageId, emoji) => {
      await rest.delete(ownReactionRoute(channelId, messageId, emoji));
    },
    deleteUserReaction: async (channelId, messageId, userId, emoji) => {
      await rest.delete(userReactionRoute(channelId, messageId, userId, emoji));
    },
  };
}
