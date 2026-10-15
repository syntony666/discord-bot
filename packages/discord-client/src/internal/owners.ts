import { TeamMemberMembershipState, TeamMemberRole } from 'discord-api-types/v10';
import type { APIApplication } from 'discord-api-types/v10';

const OWNER_TEAM_ROLES: readonly string[] = [TeamMemberRole.Admin, TeamMemberRole.Developer];

/**
 * Resolves the set of user ids allowed to run owner-only commands.
 * Team-owned app: team owner + accepted admin/developer members.
 * Personal app: the application owner. Returns [] when neither is present,
 * which fails closed (no one is an owner).
 */
export function resolveOwnerIds(app: APIApplication): string[] {
  if (app.team) {
    const ids = new Set<string>([app.team.owner_user_id]);
    for (const m of app.team.members ?? []) {
      if (m.membership_state !== TeamMemberMembershipState.Accepted) continue;
      if (m.user && OWNER_TEAM_ROLES.includes(m.role)) ids.add(m.user.id);
    }
    return [...ids];
  }
  return app.owner ? [app.owner.id] : [];
}
