import { NotificationChannel } from './member-notify.select';

export interface MessageVariables {
  user: string; // Discord mention format
  username: string;
  server: string;
  memberCount: number;
}

export interface MemberNotifyService {
  formatMessage(template: string, vars: MessageVariables): string;
  shouldSendJoin(channel: NotificationChannel | null): boolean;
  shouldSendLeave(channel: NotificationChannel | null): boolean;
}

export function createMemberNotifyService(): MemberNotifyService {
  return {
    formatMessage(template: string, vars: MessageVariables): string {
      return template
        .replace(/\{user\}/g, vars.user)
        .replace(/\{username\}/g, vars.username)
        .replace(/\{server\}/g, vars.server)
        .replace(/\{memberCount\}/g, vars.memberCount.toString());
    },

    shouldSendJoin(channel: NotificationChannel | null): boolean {
      return Boolean(channel?.enabled && channel?.channelId);
    },

    shouldSendLeave(channel: NotificationChannel | null): boolean {
      return Boolean(channel?.enabled && channel?.channelId);
    },
  };
}
