import { ReactionRoleMode } from './enums';

export interface ReactionRole {
  guildId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  description: string | null;
}

export interface ReactionRolePanel {
  guildId: string;
  messageId: string;
  channelId: string;
  title: string;
  description: string | null;
  mode: ReactionRoleMode;
  createdAt: string;
  updatedAt: string;
}

export type ReactionRoleRuntime = Pick<
  ReactionRole,
  'guildId' | 'messageId' | 'emoji' | 'roleId'
>;

export interface ReactionRoleMatch {
  roleId: string;
  mode: ReactionRoleMode;
}

export interface CreateReactionRoleInput {
  guildId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  description?: string;
}

export interface CreateReactionRolePanelInput {
  guildId: string;
  channelId: string;
  messageId: string;
  title?: string;
  description?: string;
  mode?: ReactionRoleMode;
}

export interface UpdateReactionRolePanelInput {
  title?: string;
  description?: string;
  mode?: ReactionRoleMode;
}
