/**
 * Format match type for display
 */
export function formatMatchType(matchType: string): string {
  switch (matchType) {
    case 'EXACT':
      return 'EXACT - 精確比對';
    case 'CONTAINS':
      return 'CONTAINS - 包含比對';
    default:
      return matchType;
  }
}

/**
 * Validate keyword pattern
 */
export function validateKeywordPattern(pattern: string): { valid: boolean; error?: string } {
  if (!pattern || pattern.trim().length === 0) {
    return { valid: false, error: '關鍵字不能為空' };
  }

  if (pattern.length > 100) {
    return { valid: false, error: '關鍵字長度不能超過 100 字元' };
  }

  if (pattern.includes('\n') || pattern.includes('\r')) {
    return { valid: false, error: '關鍵字不能包含換行符號' };
  }

  return { valid: true };
}

/**
 * Validate response text
 */
export function validateResponseText(response: string): { valid: boolean; error?: string } {
  if (!response || response.trim().length === 0) {
    return { valid: false, error: '回覆內容不能為空' };
  }

  if (response.length > 2000) {
    return { valid: false, error: '回覆內容長度不能超過 2000 字元' };
  }

  return { valid: true };
}
