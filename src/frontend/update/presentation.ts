import { formatUpdateBytes, formatUpdateSpeed } from '@frontend/update/format';
import { updatePreviewState } from '@frontend/update/state';

export function updateErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function updateProgressDetailText(): string {
  const parts: string[] = [];
  if (updatePreviewState.attempts > 1 && updatePreviewState.attempt > 0) {
    parts.push(`线路 ${updatePreviewState.attempt}/${updatePreviewState.attempts}`);
  }
  if (updatePreviewState.sourceLabel) parts.push(updatePreviewState.sourceLabel);
  if (updatePreviewState.received > 0) {
    parts.push(updatePreviewState.total > 0
      ? `${formatUpdateBytes(updatePreviewState.received)} / ${formatUpdateBytes(updatePreviewState.total)}`
      : `已下载 ${formatUpdateBytes(updatePreviewState.received)}`);
  }
  const speed = formatUpdateSpeed(updatePreviewState.speedBps);
  if (speed) parts.push(speed);
  if (updatePreviewState.etaSeconds > 0 && updatePreviewState.etaSeconds < 3600) {
    parts.push(`约 ${updatePreviewState.etaSeconds} 秒`);
  }
  return parts.join(' · ');
}
