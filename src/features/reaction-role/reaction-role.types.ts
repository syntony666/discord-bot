export interface CreateReactionRoleInput {
  guildId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  description?: string;
}

export interface ReactionRoleMatch {
  roleId: string;
  mode: 'NORMAL' | 'UNIQUE' | 'VERIFY';
}
