// src/features/member-notify/member-notify.service.ts

import { NotificationChannel } from './member-notify.select';

export interface MessageVariables {
  user: string; // Discord mention format
  username: string;
  server: string;
  memberCount: number;
}

/**
 * Business logic for member notification formatting and validation.
 */
export interface MemberNotifyService {
  formatMessage(template: string, vars: MessageVariables): string;
  shouldSendJoin(channel: NotificationChannel | null): boolean;
  shouldSendLeave(channel: NotificationChannel | null): boolean;
}

export function createMemberNotifyService(): MemberNotifyService {
  return {
    /**
     * Replace template variables with actual values.
     * Supports: {user}, {username}, {server}, {memberCount}
     */
    formatMessage(template: string, vars: MessageVariables): string {
      return template
        .replace(/\{user\}/g, vars.user)
        .replace(/\{username\}/g, vars.username)
        .replace(/\{server\}/g, vars.server)
        .replace(/\{memberCount\}/g, vars.memberCount.toString());
    },

    /**
     * Check if join notifications should be sent.
     * Requires: channel exists, enabled, and has channelId.
     */
    shouldSendJoin(channel: NotificationChannel | null): boolean {
      return Boolean(channel?.enabled && channel?.channelId);
    },

    /**
     * Check if leave notifications should be sent.
     * Requires: channel exists, enabled, and has channelId.
     */
    shouldSendLeave(channel: NotificationChannel | null): boolean {
      return Boolean(channel?.enabled && channel?.channelId);
    },
  };
}
