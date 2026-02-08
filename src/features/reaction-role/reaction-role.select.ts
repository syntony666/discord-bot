import { Prisma, ReactionRole, ReactionRolePanel } from '@prisma-client/client';

export const reactionRoleRuntimeSelect = {
  guildId: true,
  messageId: true,
  emoji: true,
  roleId: true,
} as const satisfies Prisma.ReactionRoleSelect;

export type ReactionRoleRuntime = Prisma.ReactionRoleGetPayload<{
  select: typeof reactionRoleRuntimeSelect;
}>;

export type { ReactionRole, ReactionRolePanel };
