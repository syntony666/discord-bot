import type { ReactionRole } from '@prisma-client/client';

/**
 * Panel mode types
 */
export type PanelMode = 'NORMAL' | 'UNIQUE' | 'VERIFY';

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
