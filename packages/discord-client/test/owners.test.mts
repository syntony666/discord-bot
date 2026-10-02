import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TeamMemberMembershipState, TeamMemberRole } from 'discord-api-types/v10';
import type { APIApplication, APITeam, APITeamMember, APIUser } from 'discord-api-types/v10';
import { resolveOwnerIds } from '../src/internal/owners.ts';

const user = (id: string) => ({ id }) as APIUser;

const member = (
  id: string,
  role: APITeamMember['role'],
  state = TeamMemberMembershipState.Accepted
) =>
  ({
    user: user(id),
    role,
    membership_state: state,
  }) as APITeamMember;

const application = (over: Partial<APIApplication>): APIApplication =>
  ({ id: 'app', name: 'bot', ...over }) as APIApplication;

const team = (members: APITeamMember[], ownerId = 'owner-1'): APITeam =>
  ({
    id: 'team-1',
    name: 'team',
    icon: null,
    owner_user_id: ownerId,
    members,
  }) as APITeam;

test('personal app resolves the application owner', () => {
  const ids = resolveOwnerIds(application({ owner: user('user-1'), team: null }));
  assert.deepEqual(ids, ['user-1']);
});

test('team app includes the team owner', () => {
  const ids = resolveOwnerIds(application({ team: team([]) }));
  assert.deepEqual(ids, ['owner-1']);
});

test('team app includes accepted admin and developer members', () => {
  const ids = resolveOwnerIds(
    application({
      team: team([
        member('admin-1', TeamMemberRole.Admin),
        member('dev-1', TeamMemberRole.Developer),
      ]),
    })
  );
  assert.deepEqual(new Set(ids), new Set(['owner-1', 'admin-1', 'dev-1']));
});

test('team app excludes read_only members', () => {
  const ids = resolveOwnerIds(
    application({ team: team([member('ro-1', TeamMemberRole.ReadOnly)]) })
  );
  assert.deepEqual(ids, ['owner-1']);
});

test('team app excludes invited members regardless of role', () => {
  const ids = resolveOwnerIds(
    application({
      team: team([member('inv-1', TeamMemberRole.Admin, TeamMemberMembershipState.Invited)]),
    })
  );
  assert.deepEqual(ids, ['owner-1']);
});

test('returns empty when neither owner nor team is present', () => {
  assert.deepEqual(resolveOwnerIds(application({ team: null })), []);
});
