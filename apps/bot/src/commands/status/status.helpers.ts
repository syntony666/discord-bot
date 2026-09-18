export function formatUptime(startTime: Date): string {
  const now = new Date();
  const uptime = now.getTime() - startTime.getTime();
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小時`);
  if (minutes > 0) parts.push(`${minutes}分鐘`);
  if (seconds > 0) parts.push(`${seconds}秒`);

  return parts.join(' ') || '0秒';
}

export function formatMemoryUsage(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function getStatusColor(uptimeMs: number): string {
  if (uptimeMs < 60000) return '🟢'; // < 1 minute
  if (uptimeMs < 300000) return '🟡'; // < 5 minutes
  if (uptimeMs < 900000) return '🟠'; // < 15 minutes
  return '🔴'; // > 15 minutes
}
