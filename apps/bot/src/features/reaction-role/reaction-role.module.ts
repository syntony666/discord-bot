import { from } from 'rxjs';
import {
  ApiRequest,
  CreateReactionRoleInput,
  CreateReactionRolePanelInput,
  orNull,
  ReactionRole,
  ReactionRolePanel,
  UpdateReactionRolePanelInput,
} from '@discord-bot/shared';

export type { ReactionRoleMatch } from '@discord-bot/shared';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;

export function createReactionRoleModule(request: ApiRequest) {
  return {
    getPanel$(guildId: string, messageId: string) {
      return from(
        orNull(request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`))
      );
    },
    getPanelsByGuild$(guildId: string) {
      return from(request<ReactionRolePanel[]>(`${base(guildId)}/reaction-role-panels`));
    },
    createPanel$(input: CreateReactionRolePanelInput) {
      const { guildId, ...body } = input;
      return from(
        request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    },
    updatePanel$(guildId: string, messageId: string, updates: UpdateReactionRolePanelInput) {
      return from(
        request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
    },
    deletePanel$(guildId: string, messageId: string) {
      return from(
        request<void>(`${base(guildId)}/reaction-role-panels/${messageId}`, { method: 'DELETE' })
      );
    },
    getReactionRole$(guildId: string, messageId: string, emoji: string) {
      return from(
        orNull(
          request<ReactionRole>(
            `${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`
          )
        )
      );
    },
    getReactionRolesByMessage$(guildId: string, messageId: string) {
      return from(
        request<ReactionRole[]>(`${base(guildId)}/reaction-roles?messageId=${messageId}`)
      );
    },
    createReactionRole$(input: CreateReactionRoleInput) {
      const { guildId, ...body } = input;
      return from(
        request<ReactionRole>(`${base(guildId)}/reaction-roles`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    },
    deleteReactionRole$(guildId: string, messageId: string, emoji: string) {
      return from(
        request<void>(
          `${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        )
      );
    },
  };
}

export type ReactionRoleModule = ReturnType<typeof createReactionRoleModule>;
