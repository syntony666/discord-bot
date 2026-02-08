import type { ReactionRole, ReactionRolePanel } from '@prisma-client/client';
import type { InteractionDataOption } from '@discordeno/bot';
import type { Bot } from '@discordeno/bot';
import type { BotInteraction } from '@core/rx/bus';
import type { ReactionRoleModule } from '@features/reaction-role/reaction-role.module';
import type { ReactionRoleService } from '@features/reaction-role/reaction-role.service';

export type PanelMode = 'NORMAL' | 'UNIQUE' | 'VERIFY';

export interface CommandContext {
  bot: Bot;
  interaction: BotInteraction;
  guildId: string;
  module: ReactionRoleModule;
  service?: ReactionRoleService;
  subCommand: InteractionDataOption;
}

export interface BuildPanelEmbedOptions {
  title?: string;
  description?: string;
  mode: PanelMode;
  roles: Array<Pick<ReactionRole, 'emoji' | 'roleId' | 'description'>>;
  messageId?: string;
}

export interface PanelDeleteData {
  guildId: string;
  panelId: string;
  panel: ReactionRolePanel;
  rolesCount: number;
}

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

export interface ReactionRoleRemoveData {
  guildId: string;
  panelId: string;
  emoji: string;
  panel: ReactionRolePanel;
  reactionRole: ReactionRole;
}
