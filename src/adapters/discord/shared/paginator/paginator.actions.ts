export type PaginatorAction = 'prev' | 'page' | 'next';

export function parsePaginatorAction(
  customId: string
): { sessionId: string; action: PaginatorAction } | null {
  if (!customId.startsWith('pg:')) return null;
  const parts = customId.split(':');
  if (parts.length !== 3) return null;

  const sessionId = parts[1] as string;
  const action = parts[2] as string;

  if (action !== 'prev' && action !== 'page' && action !== 'next') return null;

  return { sessionId, action };
}
