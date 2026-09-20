import type {
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIMessage,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import type { BotGuild, BotUser } from '@core/rx/bus';

export interface DiscordActions {
  readonly botId: bigint;
  sendMessage(
    channelId: bigint | string,
    content: RESTPostAPIChannelMessageJSONBody
  ): Promise<APIMessage>;
  sendInteractionResponse(
    id: bigint | string,
    token: string,
    response: APIInteractionResponse
  ): Promise<unknown>;
  editOriginalInteractionResponse(
    token: string,
    data: APIInteractionResponseCallbackData
  ): Promise<unknown>;
  editMessage(
    channelId: bigint | string,
    messageId: bigint | string,
    options: RESTPatchAPIChannelMessageJSONBody
  ): Promise<unknown>;
  deleteMessage(
    channelId: bigint | string,
    messageId: bigint | string,
    reason?: string
  ): Promise<unknown>;
  getGuild(guildId: bigint | string): Promise<BotGuild>;
  getUser(userId: bigint | string): Promise<BotUser>;
  addRole(
    guildId: bigint | string,
    userId: bigint | string,
    roleId: bigint | string,
    reason?: string
  ): Promise<unknown>;
  removeRole(
    guildId: bigint | string,
    userId: bigint | string,
    roleId: bigint | string,
    reason?: string
  ): Promise<unknown>;
  addReaction(
    channelId: bigint | string,
    messageId: bigint | string,
    emoji: string
  ): Promise<unknown>;
  deleteOwnReaction(
    channelId: bigint | string,
    messageId: bigint | string,
    emoji: string
  ): Promise<unknown>;
  deleteUserReaction(
    channelId: bigint | string,
    messageId: bigint | string,
    userId: bigint | string,
    emoji: string
  ): Promise<unknown>;
}
