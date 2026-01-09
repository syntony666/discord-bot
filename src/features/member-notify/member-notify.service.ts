import { MemberNotifyConfig } from '@prisma-client/client';

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
  shouldSendJoin(config: MemberNotifyConfig | null): boolean;
  shouldSendLeave(config: MemberNotifyConfig | null): boolean;
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
     * Requires: config enabled, join enabled, and channel set.
     */
    shouldSendJoin(config: MemberNotifyConfig | null): boolean {
      return Boolean(config?.enabled && config?.joinEnabled && config?.channelId);
    },

    /**
     * Check if leave notifications should be sent.
     * Requires: config enabled, leave enabled, and channel set.
     */
    shouldSendLeave(config: MemberNotifyConfig | null): boolean {
      return Boolean(config?.enabled && config?.leaveEnabled && config?.channelId);
    },
  };
}
