import { ReactionRole, ReactionRolePanel } from '@prisma-client/client';

/**
 * Data structure for reaction role remove confirmation
 */
export interface ReactionRoleRemoveData {
  guildId: string;
  panelId: string;
  emoji: string;
  panel: ReactionRolePanel;
  reactionRole: ReactionRole;
}
