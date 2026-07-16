let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: unknown): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = String(message ?? '');
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
