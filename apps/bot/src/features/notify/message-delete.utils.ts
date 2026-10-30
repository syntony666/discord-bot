import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10';
import { Formatters } from '@discord-bot/discord-client';

export interface CachedMessage {
  authorId: string;
  authorName: string;
  avatar: string | null;
  isBot: boolean;
  content: string;
  attachmentCount: number;
  timestamp: string;
}

/** FIFO-bounded in-memory cache — a delete is only logged when the bot saw
 *  the message. Restart or eviction means the delete slips through. */
export function createMessageCache(capacity: number) {
  const map = new Map<string, CachedMessage>();
  return {
    set(id: string, entry: CachedMessage) {
      map.delete(id);
      map.set(id, entry);
      if (map.size > capacity) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
    },
    get: (id: string) => map.get(id),
    delete: (id: string) => map.delete(id),
    get size() {
      return map.size;
    },
  };
}

const CONTENT_LIMIT = 1000;

export function buildDeleteLogEmbed(
  msg: CachedMessage,
  channelId: string,
  color: number
): APIEmbed {
  const fields: APIEmbedField[] = [
    { name: '作者', value: Formatters.userMention(msg.authorId), inline: true },
    { name: '頻道', value: Formatters.channelMention(channelId), inline: true },
    {
      name: '訊息時間',
      value: Formatters.time(Math.floor(new Date(msg.timestamp).getTime() / 1000), 'R'),
      inline: true,
    },
  ];
  if (msg.attachmentCount > 0) {
    fields.push({ name: '附件', value: `${msg.attachmentCount} 個`, inline: true });
  }
  const ext = msg.avatar?.startsWith('a_') ? 'gif' : 'webp';
  return {
    title: '訊息被刪除',
    description: msg.content.slice(0, CONTENT_LIMIT) || '(無文字內容)',
    color,
    fields,
    thumbnail: msg.avatar
      ? { url: `https://cdn.discordapp.com/avatars/${msg.authorId}/${msg.avatar}.${ext}` }
      : undefined,
  };
}
