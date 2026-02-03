import type { ReactionRole, ReactionRolePanel } from '@prisma-client/client';
import type { InteractionDataOption } from '@discordeno/bot';

/**
 * Panel mode types
 */
export type PanelMode = 'NORMAL' | 'UNIQUE' | 'VERIFY';

/**
 * Command execution context
 */
export interface CommandContext {
  bot: any;
  interaction: any;
  guildId: string;
  module: any;
  service?: any;
  subCommand: InteractionDataOption;
}

/**
 * Options for building panel embed
 */
export interface BuildPanelEmbedOptions {
  title?: string;
  description?: string;
  mode: PanelMode;
  roles: Array<Pick<ReactionRole, 'emoji' | 'roleId' | 'description'>>;
  messageId?: string;
}

/**
 * Data structure for panel delete confirmation
 */
export interface PanelDeleteData {
  guildId: string;
  panelId: string;
  panel: ReactionRolePanel;
  rolesCount: number;
}

/**
 * Data structure for panel edit confirmation
 */
export interface PanelEditData {
  guildId: string;
  panelId: string;
  panel: ReactionRolePanel;
  updates: {
    title?: string;
    description?: string;
    mode?: PanelMode;
  };
}

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
