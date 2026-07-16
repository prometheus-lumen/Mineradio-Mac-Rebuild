export function formatUpdateBytes(value: unknown): string {
  const bytes = Number(value) || 0;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(/\.00$/, '')} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatUpdateSpeed(value: unknown): string {
  const bytesPerSecond = Number(value) || 0;
  return bytesPerSecond > 0 ? `${formatUpdateBytes(bytesPerSecond)}/s` : '';
}
