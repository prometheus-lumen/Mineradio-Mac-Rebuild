function setShelfMode(mode: string): void {
  const normalizedMode = /^(off|side|stage)$/.test(mode) ? mode : fxDefaults.shelf;
  fx.shelf = normalizedMode;
  document.querySelectorAll<HTMLElement>('#shelf-seg button')
    .forEach((button) => button.classList.toggle('active', button.dataset.shelf === normalizedMode));
  shelfManager?.setMode?.(normalizedMode);
  document.getElementById('search-area')?.classList.toggle('stage-mode', normalizedMode === 'stage');
  document.getElementById('bottom-bar')?.classList.toggle('stage-mode', normalizedMode === 'stage');
  saveLyricLayout();
}

function updateShelfControlUi(): void {
  fx.shelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  fx.shelfPresence = normalizeShelfPresence(fx.shelfPresence || fxDefaults.shelfPresence);
  document.querySelectorAll<HTMLElement>('#shelf-camera-seg [data-shelf-camera]').forEach((button) => {
    button.classList.toggle('active', button.dataset.shelfCamera === fx.shelfCameraMode);
  });
  document.querySelectorAll<HTMLElement>('#shelf-presence-seg [data-shelf-presence]').forEach((button) => {
    button.classList.toggle('active', button.dataset.shelfPresence === fx.shelfPresence);
  });
  const color = shelfAccentHex();
  const picker = document.querySelector<HTMLInputElement>('#shelf-accent-picker');
  const value = document.getElementById('shelf-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}

function refreshShelfVisuals(reason?: string): void {
  updateShelfControlUi();
  shelfManager?.refreshTheme?.();
  if (reason === 'mode') shelfManager?.rebuild?.(true);
}

function setShelfAccentColor(color?: string, silent = false): void {
  fx.shelfAccentColor = normalizeHexColor(color || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor);
  refreshShelfVisuals('color');
  saveLyricLayout();
  if (!silent) showToast(`歌单架颜色: ${fx.shelfAccentColor.toUpperCase()}`);
}

function resetShelfAccentColor(): void {
  setShelfAccentColor(fxDefaults.shelfAccentColor || '#f4d28a');
}

function shouldShowShelfHoverCue(value = 0): boolean {
  if (document.body.classList.contains('splash-active')) return false;
  if (!shelfHoverCue.guide && document.querySelector('.modal-mask.show')) return false;
  if (!shelfHoverCue.guide) {
    if (shelfPinnedOpen || !shelfManager?.canInteract?.() || shelfManager.hasOpenContent?.()) return false;
    if (shelfManager.getMode?.() !== 'side') return false;
  }
  return shelfHoverCue.guide || shelfHoverCue.target > 0 || (value || shelfHoverCue.value) > 0.015;
}
