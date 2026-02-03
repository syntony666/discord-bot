/**
 * Format message template with variables
 */
export function formatMessageTemplate(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return result;
}

/**
 * Validate message template
 */
export function validateMessageTemplate(template: string): { valid: boolean; error?: string } {
  if (!template || template.trim().length === 0) {
    return { valid: false, error: '訊息模板不能為空' };
  }

  if (template.length > 1000) {
    return { valid: false, error: '訊息模板長度不能超過 1000 字元' };
  }

  return { valid: true };
}

/**
 * Get default message templates
 */
export function getDefaultTemplates(): { join: string; leave: string } {
  return {
    join: '📥 {user} 加入了 {server}！目前共 {memberCount} 位成員',
    leave: '📤 {username} 離開了 {server}。目前剩餘 {memberCount} 位成員',
  };
}

/**
 * Get notification type display name
 */
export function getNotificationTypeName(type: 'join' | 'leave'): string {
  return type === 'join' ? '加入通知' : '離開通知';
}

/**
 * Get notification type emoji
 */
export function getNotificationTypeEmoji(enabled: boolean): string {
  return enabled ? '✅' : '❌';
}
