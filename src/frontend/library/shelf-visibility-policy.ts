function shouldUseWallpaperSafeShelfCamera(): boolean {
  return Boolean(fx && Number(fx.preset) === 5);
}

function shouldUseSkullSafeShelfCamera(): boolean {
  return Boolean(fx && Number(fx.preset) === SKULL_PRESET_INDEX);
}

function shouldDimWallpaperForShelf(): boolean {
  if (!shouldUseWallpaperSafeShelfCamera() || shelfManager?.getMode?.() !== 'side') return false;
  return shelfPinnedOpen || Boolean(shelfManager.hasOpenContent?.());
}

function shouldOffsetLyricsForShelfDetail(): boolean {
  return shelfManager?.getMode?.() === 'side' && Boolean(shelfManager.hasOpenContent?.());
}

function isBottomControlsSuppressedForShelf(): boolean {
  let contentOpen = false;
  try {
    contentOpen = Boolean(shelfManager?.hasOpenContent?.());
  } catch (error) {}
  return Boolean(shelfPinnedOpen || contentOpen
    || (controlsShelfSuppressUntil && performance.now() < controlsShelfSuppressUntil));
}

function suppressBottomControlsForShelf(duration = 900): void {
  controlsShelfSuppressUntil = performance.now() + duration;
  controlsHovering = false;
  if (controlsHideTimer) {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = null;
  }
  document.body.classList.remove('controls-handle-awake');
  if (miniQueueOpen) closeMiniQueue();
  const bottomBar = document.getElementById('bottom-bar');
  bottomBar?.classList.remove('visible', 'soft-hidden');
  if (bottomBar) bottomBar.style.pointerEvents = '';
  updateControlsChromeState();
}

function isSkullShelfCompositionActive(): boolean {
  if (fx?.preset !== SKULL_PRESET_INDEX || shelfManager?.getMode?.() !== 'side') return false;
  return shelfPinnedOpen || shelfVisibility > 0.18 || Boolean(shelfManager.hasOpenContent?.());
}

function shelfDefaultAngleForCameraMode(mode: unknown): number {
  return normalizeShelfCameraMode(mode) === 'static' ? -15 : 0;
}

function applyShelfCameraDefaultAngle(force = false): void {
  if (!fx) return;
  fx.shelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  if (force || fx.shelfAngleYManual !== true) {
    fx.shelfAngleYManual = false;
    fx.shelfAngleY = shelfDefaultAngleForCameraMode(fx.shelfCameraMode);
  } else {
    fx.shelfAngleY = Math.round(clampRange(Number(fx.shelfAngleY) || 0, -30, 30));
  }
}

function normalizedShelfNumber(key: keyof FxSettings, fallback: number, minimum: number, maximum: number): number {
  let value = fx?.[key] != null ? Number(fx[key]) : fallback;
  if (!Number.isFinite(value)) value = fallback;
  return clampRange(value, minimum, maximum);
}

function shelfSettings(): ShelfSettings {
  const angle = fx?.shelfAngleYManual === true
    ? normalizedShelfNumber('shelfAngleY', shelfDefaultAngleForCameraMode(fx.shelfCameraMode), -30, 30)
    : shelfDefaultAngleForCameraMode(fx?.shelfCameraMode);
  return {
    size: normalizedShelfNumber('shelfSize', fxDefaults.shelfSize, 0.65, 1.45),
    x: normalizedShelfNumber('shelfOffsetX', fxDefaults.shelfOffsetX, -1.2, 1.2),
    y: normalizedShelfNumber('shelfOffsetY', fxDefaults.shelfOffsetY, -0.9, 0.9),
    z: normalizedShelfNumber('shelfOffsetZ', fxDefaults.shelfOffsetZ, -0.9, 0.9),
    angle: angle * Math.PI / 180,
    opacity: normalizedShelfNumber('shelfOpacity', fxDefaults.shelfOpacity, 0.25, 1),
    bgOpacity: normalizedShelfNumber('shelfBgOpacity', fxDefaults.shelfBgOpacity, 0.25, 0.98),
    accent: normalizeHexColor(fx?.shelfAccentColor || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor)
  };
}

function shelfAlwaysVisible(): boolean {
  return normalizeShelfPresence(fx?.shelfPresence) === 'always';
}

function shouldUseShelfDynamicCamera(type: unknown): boolean {
  if (!/^shelf-/.test(String(type || ''))) return true;
  return normalizeShelfCameraMode(fx?.shelfCameraMode) !== 'static';
}

function shelfAccentHex(): string {
  return normalizeHexColor(fx?.shelfAccentColor || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor);
}

function shelfAccentRgba(alpha: number, fallback?: string): string {
  const rgb = hexToRgb(shelfAccentHex());
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : fallback || `rgba(244,210,138,${alpha})`;
}
