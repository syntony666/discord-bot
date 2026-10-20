import type { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type {
  APIApplication,
  APIChannel,
  APIGuild,
  APIGuildMember,
  APIMessage,
  APIUser,
  GatewayPresenceUpdateData,
  RESTGetAPICurrentUserGuildsResult,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPatchCurrentApplicationJSONBody,
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPICurrentUserCreateDMChannelJSONBody,
} from 'discord-api-types/v10';
import { DiscordSnowflake } from '@sapphire/snowflake';

const BULK_DELETE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const ownReactionRoute = (channelId: string, messageId: string, emoji: string) =>
  Routes.channelMessageOwnReaction(channelId, messageId, encodeURIComponent(emoji));

const userReactionRoute = (channelId: string, messageId: string, userId: string, emoji: string) =>
  Routes.channelMessageUserReaction(channelId, messageId, encodeURIComponent(emoji), userId);

export function createHelpers(
  rest: REST,
  getBotUser: () => APIUser | null,
  getPing: () => number,
  sendPresence?: (data: GatewayPresenceUpdateData) => Promise<void>
) {
  const commandIds = new Map<string, string>();
  const ownerIds = new Set<string>();

  return {
    get wsPing() {
      return getPing();
    },
    get botId() {
      return getBotUser()?.id ?? '';
    },
    get botUser() {
      return getBotUser();
    },

    isOwner: (userId: string) => ownerIds.has(userId),
    setOwnerIds: (ids: readonly string[]) => {
      ownerIds.clear();
      for (const id of ids) ownerIds.add(id);
    },

    /** Called by sync() after commands.overwrite resolves. */
    setCommandIds: (commands: readonly { id: string; name: string }[]) => {
      commandIds.clear();
      for (const c of commands) commandIds.set(c.name, c.id);
    },
    /** Clickable </path:id> mention; falls back to `/path` text. */
    commandMention: (path: string) => {
      const root = path.split(' ')[0];
      const id = root ? commandIds.get(root) : undefined;
      return id ? `</${path}:${id}>` : `\`/${path}\``;
    },

    sendMessage: (channelId: string, body: RESTPostAPIChannelMessageJSONBody) =>
      rest.post(Routes.channelMessages(channelId), { body }) as Promise<APIMessage>,
    getChannel: (channelId: string) => rest.get(Routes.channel(channelId)) as Promise<APIChannel>,
    /** Fetches up to `limit` recent messages, paginating in chunks of 100. */
    getChannelMessages: async (
      channelId: string,
      opts: { limit?: number; before?: string } = {}
    ): Promise<APIMessage[]> => {
      const { limit = 100 } = opts;
      const out: APIMessage[] = [];
      let before = opts.before;
      while (out.length < limit) {
        const params = new URLSearchParams();
        params.set('limit', String(Math.min(100, limit - out.length)));
        if (before !== undefined) params.set('before', before);
        const page = (await rest.get(
          `${Routes.channelMessages(channelId)}?${params.toString()}`
        )) as APIMessage[];
        if (page.length === 0) break;
        out.push(...page);
        before = page[page.length - 1]!.id;
        if (page.length < 100) break;
      }
      return out;
    },
    /**
     * Deletes many messages: chunks of 100, single-delete for leftovers of
     * one, and skips messages older than Discord's 14-day bulk-delete window.
     */
    bulkDeleteMessages: async (
      channelId: string,
      messageIds: readonly string[],
      reason?: string
    ) => {
      const cutoff = Date.now() - BULK_DELETE_WINDOW_MS;
      const deleted: string[] = [];
      const skipped: string[] = [];
      for (const id of messageIds) {
        (DiscordSnowflake.timestampFrom(id) > cutoff ? deleted : skipped).push(id);
      }
      for (let i = 0; i < deleted.length; i += 100) {
        const chunk = deleted.slice(i, i + 100);
        if (chunk.length === 1) {
          await rest.delete(Routes.channelMessage(channelId, chunk[0]!), { reason });
        } else if (chunk.length > 1) {
          await rest.post(Routes.channelBulkDelete(channelId), {
            body: { messages: chunk },
            reason,
          });
        }
      }
      return { deleted, skipped };
    },
    getMessage: (channelId: string, messageId: string) =>
      rest.get(Routes.channelMessage(channelId, messageId)) as Promise<APIMessage>,
    editMessage: (channelId: string, messageId: string, body: RESTPatchAPIChannelMessageJSONBody) =>
      rest.patch(Routes.channelMessage(channelId, messageId), {
        body,
      }) as Promise<APIMessage>,
    deleteMessage: (channelId: string, messageId: string, reason?: string) =>
      rest.delete(Routes.channelMessage(channelId, messageId), { reason }),

    addReaction: (channelId: string, messageId: string, emoji: string) =>
      rest.put(ownReactionRoute(channelId, messageId, emoji)),
    removeReaction: (channelId: string, messageId: string, emoji: string, userId?: string) =>
      rest.delete(
        userId
          ? userReactionRoute(channelId, messageId, userId, emoji)
          : ownReactionRoute(channelId, messageId, emoji)
      ),

    getGuild: (guildId: string) =>
      rest.get(`${Routes.guild(guildId)}?with_counts=true`) as Promise<APIGuild>,
    getMember: (guildId: string, userId: string) =>
      rest.get(Routes.guildMember(guildId, userId)) as Promise<APIGuildMember>,
    addRole: (guildId: string, userId: string, roleId: string, reason?: string) =>
      rest.put(Routes.guildMemberRole(guildId, userId, roleId), { reason }),
    removeRole: (guildId: string, userId: string, roleId: string, reason?: string) =>
      rest.delete(Routes.guildMemberRole(guildId, userId, roleId), { reason }),

    getUser: (userId: string) => rest.get(Routes.user(userId)) as Promise<APIUser>,
    getBotGuilds: () =>
      rest.get(
        `${Routes.userGuilds()}?with_counts=true&limit=200`
      ) as Promise<RESTGetAPICurrentUserGuildsResult>,
    leaveGuild: (guildId: string) => rest.delete(Routes.userGuild(guildId)),
    openDm: (userId: string) =>
      rest.post(Routes.userChannels(), {
        body: { recipient_id: userId } satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
      }) as Promise<APIChannel>,

    updatePresence: async (data: GatewayPresenceUpdateData) => {
      if (!sendPresence) throw new Error('gateway is not connected');
      await sendPresence(data);
    },
    editApplication: (body: RESTPatchCurrentApplicationJSONBody) =>
      rest.patch(Routes.currentApplication(), { body }) as Promise<APIApplication>,
  };
}
