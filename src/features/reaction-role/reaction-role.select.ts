// src/features/reaction-role/reaction-role.select.ts

import { Prisma, ReactionRole, ReactionRolePanel } from '@prisma-client/client';

/**
 * Runtime selector for reaction role processing.
 *
 * Purpose: High-frequency reaction event handling
 * Usage: messageReactionAdd/Remove event handlers
 * Optimization: Only includes fields needed for role assignment logic
 * Performance gain: Minimal overhead, focused data structure
 */
export const reactionRoleRuntimeSelect = {
  guildId: true,
  messageId: true,
  emoji: true,
  roleId: true,
} as const satisfies Prisma.ReactionRoleSelect;

/**
 * Runtime type for reaction role processing.
 * Use this for high-frequency reaction event handling.
 * For admin operations, use ReactionRole (full model).
 */
export type ReactionRoleRuntime = Prisma.ReactionRoleGetPayload<{
  select: typeof reactionRoleRuntimeSelect;
}>;

/**
 * Full types for admin operations.
 * Use these for CRUD operations and detail views.
 */
export type { ReactionRole, ReactionRolePanel };
