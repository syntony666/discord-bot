import type {
  CreateMessageOptions,
  EditMessage,
  InteractionCallbackData,
  InteractionResponse,
} from '@discordeno/bot';
import type { BotGuild, BotMessage, BotUser } from '@core/rx/bus';

export interface DiscordActions {
  readonly botId: bigint;
  sendMessage(channelId: bigint | string, content: CreateMessageOptions): Promise<BotMessage>;
  sendInteractionResponse(id: bigint, token: string, response: InteractionResponse): Promise<unknown>;
  editOriginalInteractionResponse(token: string, data: InteractionCallbackData): Promise<unknown>;
  editMessage(channelId: bigint | string, messageId: bigint | string, options: EditMessage): Promise<unknown>;
  deleteMessage(channelId: bigint | string, messageId: bigint | string, reason?: string): Promise<unknown>;
  getGuild(guildId: bigint | string): Promise<BotGuild>;
  getUser(userId: bigint | string): Promise<BotUser>;
  addRole(guildId: bigint | string, userId: bigint | string, roleId: bigint | string, reason?: string): Promise<unknown>;
  removeRole(guildId: bigint | string, userId: bigint | string, roleId: bigint | string, reason?: string): Promise<unknown>;
  addReaction(channelId: bigint | string, messageId: bigint | string, emoji: string): Promise<unknown>;
  deleteOwnReaction(channelId: bigint | string, messageId: bigint | string, emoji: string): Promise<unknown>;
  deleteUserReaction(
    channelId: bigint | string,
    messageId: bigint | string,
    userId: bigint | string,
    emoji: string
  ): Promise<unknown>;
}
