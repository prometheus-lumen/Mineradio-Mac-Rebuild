export function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function escHtml(value: unknown): string {
  const element = document.createElement('div');
  element.textContent = String(value ?? '');
  return element.innerHTML;
}
