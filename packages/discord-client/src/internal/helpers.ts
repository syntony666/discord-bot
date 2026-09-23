import type {
  APIMessage,
  RESTPatchAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import { DiscordSnowflake } from '@sapphire/snowflake';
import type { Resources } from './resources';

const BULK_DELETE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function createHelpers(resources: Resources, getPing: () => number) {
  const commandIds = new Map<string, string>();

  return {
    get wsPing() {
      return getPing();
    },
    get botId() {
      return resources.botId;
    },
    get botUser() {
      return resources.botUser;
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
      resources.channel(channelId).send(body),
    getChannel: (channelId: string) => resources.channel(channelId).get(),
    /** Fetches up to `limit` recent messages, paginating in chunks of 100. */
    getChannelMessages: async (
      channelId: string,
      opts: { limit?: number; before?: string } = {}
    ): Promise<APIMessage[]> => {
      const { limit = 100 } = opts;
      const out: APIMessage[] = [];
      let before = opts.before;
      while (out.length < limit) {
        const page = await resources.channel(channelId).messages.list({
          limit: Math.min(100, limit - out.length),
          before,
        });
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
          await resources.channel(channelId).message(chunk[0]!).delete(reason);
        } else if (chunk.length > 1) {
          await resources.channel(channelId).messages.bulkDelete(chunk, reason);
        }
      }
      return { deleted, skipped };
    },
    getMessage: (channelId: string, messageId: string) =>
      resources.channel(channelId).message(messageId).get(),
    editMessage: (channelId: string, messageId: string, body: RESTPatchAPIChannelMessageJSONBody) =>
      resources.channel(channelId).message(messageId).edit(body),
    deleteMessage: (channelId: string, messageId: string, reason?: string) =>
      resources.channel(channelId).message(messageId).delete(reason),

    addReaction: (channelId: string, messageId: string, emoji: string) =>
      resources.channel(channelId).message(messageId).reactions.add(emoji),
    removeReaction: (channelId: string, messageId: string, emoji: string, userId?: string) =>
      resources.channel(channelId).message(messageId).reactions.remove(emoji, userId),

    getGuild: (guildId: string) => resources.guild(guildId).get(),
    getMember: (guildId: string, userId: string) => resources.guild(guildId).member(userId).get(),
    addRole: (guildId: string, userId: string, roleId: string, reason?: string) =>
      resources.guild(guildId).member(userId).roles.add(roleId, reason),
    removeRole: (guildId: string, userId: string, roleId: string, reason?: string) =>
      resources.guild(guildId).member(userId).roles.remove(roleId, reason),

    getUser: (userId: string) => resources.user(userId).get(),
  };
}
