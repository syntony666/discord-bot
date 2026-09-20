import type {
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIMessage,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import type { BotGuild, BotUser } from '@core/rx/bus';

export interface DiscordActions {
  readonly botId: string;
  sendMessage(
    channelId: string,
    content: RESTPostAPIChannelMessageJSONBody
  ): Promise<APIMessage>;
  sendInteractionResponse(
    id: string,
    token: string,
    response: APIInteractionResponse
  ): Promise<unknown>;
  editOriginalInteractionResponse(
    token: string,
    data: APIInteractionResponseCallbackData
  ): Promise<unknown>;
  editMessage(
    channelId: string,
    messageId: string,
    options: RESTPatchAPIChannelMessageJSONBody
  ): Promise<unknown>;
  deleteMessage(
    channelId: string,
    messageId: string,
    reason?: string
  ): Promise<unknown>;
  getGuild(guildId: string): Promise<BotGuild>;
  getUser(userId: string): Promise<BotUser>;
  addRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<unknown>;
  removeRole(
    guildId: string,
    userId: string,
    roleId: string,
    reason?: string
  ): Promise<unknown>;
  addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<unknown>;
  deleteOwnReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<unknown>;
  deleteUserReaction(
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<unknown>;
}
