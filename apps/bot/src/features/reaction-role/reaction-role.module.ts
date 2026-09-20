import { Observable } from 'rxjs';
import {
  CreateReactionRoleInput,
  CreateReactionRolePanelInput,
  ReactionRole,
  ReactionRolePanel,
  UpdateReactionRolePanelInput,
} from '@discord-bot/shared';

export type { CreateReactionRoleInput };
export type { ReactionRoleMatch } from '@discord-bot/shared';

export interface ReactionRoleModule {
  // Panel CRUD
  getPanel$(guildId: string, messageId: string): Observable<ReactionRolePanel | null>;
  getPanelsByGuild$(guildId: string): Observable<ReactionRolePanel[]>;
  createPanel$(input: CreateReactionRolePanelInput): Observable<ReactionRolePanel>;
  updatePanel$(
    guildId: string,
    messageId: string,
    updates: UpdateReactionRolePanelInput
  ): Observable<ReactionRolePanel>;
  deletePanel$(guildId: string, messageId: string): Observable<void>;

  // Reaction Role CRUD
  getReactionRole$(
    guildId: string,
    messageId: string,
    emoji: string
  ): Observable<ReactionRole | null>;
  getReactionRolesByMessage$(guildId: string, messageId: string): Observable<ReactionRole[]>;
  createReactionRole$(input: CreateReactionRoleInput): Observable<ReactionRole>;
  deleteReactionRole$(guildId: string, messageId: string, emoji: string): Observable<void>;
}
