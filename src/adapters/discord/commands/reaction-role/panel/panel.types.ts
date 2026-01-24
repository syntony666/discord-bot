import { ReactionRolePanel } from '@prisma-client/client';
import type { PanelMode } from '../reaction-role.types';

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
