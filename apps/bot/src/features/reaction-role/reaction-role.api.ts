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

export function createReactionRoleApi(request: ApiRequest) {
  return {
    getPanel(guildId: string, messageId: string) {
      return orNull(
        request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`)
      );
    },
    getPanelsByGuild(guildId: string) {
      return request<ReactionRolePanel[]>(`${base(guildId)}/reaction-role-panels`);
    },
    createPanel(input: CreateReactionRolePanelInput) {
      const { guildId, ...body } = input;
      return request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    updatePanel(guildId: string, messageId: string, updates: UpdateReactionRolePanelInput) {
      return request<ReactionRolePanel>(`${base(guildId)}/reaction-role-panels/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    deletePanel(guildId: string, messageId: string) {
      return request<void>(`${base(guildId)}/reaction-role-panels/${messageId}`, {
        method: 'DELETE',
      });
    },
    getReactionRole(guildId: string, messageId: string, emoji: string) {
      return orNull(
        request<ReactionRole>(
          `${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`
        )
      );
    },
    getReactionRolesByMessage(guildId: string, messageId: string) {
      return request<ReactionRole[]>(`${base(guildId)}/reaction-roles?messageId=${messageId}`);
    },
    createReactionRole(input: CreateReactionRoleInput) {
      const { guildId, ...body } = input;
      return request<ReactionRole>(`${base(guildId)}/reaction-roles`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    deleteReactionRole(guildId: string, messageId: string, emoji: string) {
      return request<void>(
        `${base(guildId)}/reaction-roles/${messageId}/${encodeURIComponent(emoji)}`,
        { method: 'DELETE' }
      );
    },
  };
}

export type ReactionRoleApi = ReturnType<typeof createReactionRoleApi>;
