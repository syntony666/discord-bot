/**
 * Custom ID prefixes for Discord component interactions
 */
export const CustomIdPrefixes = {
  /** Paginator navigation buttons */
  PAGINATOR: 'pg',

  /** Keyword overwrite confirmation */
  KEYWORD_OVERWRITE: 'kw_overwrite',

  /** Keyword delete confirmation */
  KEYWORD_DELETE: 'kw_delete',

  /** Reaction role panel delete confirmation */
  REACTION_ROLE_PANEL_DELETE: 'rr_panel_delete',

  /** Reaction role panel edit confirmation */
  REACTION_ROLE_PANEL_EDIT: 'rr_panel_edit',

  /** Reaction role remove confirmation */
  REACTION_ROLE_REMOVE: 'rr_role_remove',

  /** Member notify disable confirmation */
  MEMBER_NOTIFY_DISABLE: 'member_notify_disable',
} as const;

export type CustomIdPrefix = (typeof CustomIdPrefixes)[keyof typeof CustomIdPrefixes];
