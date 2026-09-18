export const CustomIdPrefixes = {
  PAGINATOR: 'pg',
  KEYWORD_OVERWRITE: 'kw_overwrite',
  KEYWORD_DELETE: 'kw_delete',
  REACTION_ROLE_PANEL_DELETE: 'rr_panel_delete',
  REACTION_ROLE_PANEL_EDIT: 'rr_panel_edit',
  REACTION_ROLE_REMOVE: 'rr_role_remove',
  MEMBER_NOTIFY_DISABLE: 'member_notify_disable',
} as const;

export type CustomIdPrefix = (typeof CustomIdPrefixes)[keyof typeof CustomIdPrefixes];
