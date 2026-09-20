import { from } from 'rxjs';
import {
  ApiRequest,
  CreateReactionRolePanelInput,
  orNull,
  ReactionRole,
  ReactionRolePanel,
  UpdateReactionRolePanelInput,
} from '@discord-bot/shared';
import { CreateReactionRoleInput, ReactionRoleModule } from './reaction-role.module';

const base = (guildId: string) => `/api/v1/guilds/${guildId}`;

export function createHttpReactionRoleModule(request: ApiRequest): ReactionRoleModule {
  return {
    getPanel$(guildId, messageId) {
      return from(
        orNull(request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`))
      );
    },
    getPanelsByGuild$(guildId) {
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
    updatePanel$(guildId, messageId, updates: UpdateReactionRolePanelInput) {
      return from(
        request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
    },
    deletePanel$(guildId, messageId) {
      return from(
        request<void>(`${base(guildId)}/reaction-role-panels/${messageId}`, { method: 'DELETE' })
      );
    },
    getReactionRole$(guildId, messageId, emoji) {
      return from(
        orNull(
          request<ReactionRole>(
            `${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`
          )
        )
      );
    },
    getReactionRolesByMessage$(guildId, messageId) {
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
    deleteReactionRole$(guildId, messageId, emoji) {
      return from(
        request<void>(`${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`, {
          method: 'DELETE',
        })
      );
    },
  };
}
