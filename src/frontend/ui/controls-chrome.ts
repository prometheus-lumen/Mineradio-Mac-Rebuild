function setControlsHidden(hidden: boolean): void {
  var bar = document.getElementById('bottom-bar');
  if (!bar) return;
  var shouldHide = hidden && !controlsHovering && !miniQueueOpen;
  bar.classList.toggle('soft-hidden', shouldHide && controlsAutoHide && bar.classList.contains('visible'));
  bar.style.pointerEvents = '';
  updateControlsChromeState();
}

function scheduleControlsHide(delay = 480): void {
  if (controlsHideTimer) clearTimeout(controlsHideTimer);
  if (!controlsAutoHide) return;
  controlsHideTimer = setTimeout(function(): void {
    controlsHideTimer = null;
    if (!controlsHovering) setControlsHidden(true);
  }, delay);
}

function revealBottomControls(delay = 520): void {
  if (document.body.classList.contains('home-controls-locked') || isBottomControlsSuppressedForShelf()) return;
  document.getElementById('bottom-bar')?.classList.add('visible');
  wakeBottomHandle();
  setControlsHidden(false);
  if (controlsAutoHide) scheduleControlsHide(delay);
}

function updateControlsChromeState(): void {
  var bar = document.getElementById('bottom-bar');
  var visible = !!bar?.classList.contains('visible') && !bar.classList.contains('soft-hidden');
  document.body.classList.toggle('controls-visible', visible);
  document.getElementById('bottom-handle')?.classList.toggle('active', visible);
}

function pointNearRect(x: number, y: number, rect: DOMRect, horizontal: number, top: number, bottom: number): boolean {
  return x >= rect.left - horizontal && x <= rect.right + horizontal && y >= rect.top - top && y <= rect.bottom + bottom;
}

function updateControlsAutoHideFromPointer(x: number, y: number): void {
  if (document.body.classList.contains('home-controls-locked') || isBottomControlsSuppressedForShelf()) return;
  var bar = document.getElementById('bottom-bar');
  if (!bar?.classList.contains('visible')) return;
  if (!controlsAutoHide) {
    setControlsHidden(false);
    return;
  }
  if (pointerOverDiyControls(x, y)) {
    scheduleControlsHide(80);
    return;
  }
  controlsLastMoveAt = performance.now();
  var handle = document.getElementById('bottom-handle');
  var miniQueue = document.getElementById('mini-queue-popover');
  var overHandle = !!handle && pointNearRect(x, y, handle.getBoundingClientRect(), 18, 12, 14);
  var overBar = pointNearRect(x, y, bar.getBoundingClientRect(), 18, 18, 14);
  var overMiniQueue = miniQueueOpen && !!miniQueue && pointNearRect(x, y, miniQueue.getBoundingClientRect(), 16, 16, 16);
  if (overHandle) wakeBottomHandle();
  if (overBar || overMiniQueue || overHandle) revealBottomControls(overHandle ? 900 : 520);
  else scheduleControlsHide(70);
}

function pointerOverDiyControls(x: number, y: number): boolean {
  if (!diyPlayerMode) return false;
  var panel = document.getElementById('fx-panel');
  var fab = document.getElementById('fx-fab');
  var overPanel = !!panel && (panel.classList.contains('peek') || panel.classList.contains('show'))
    && pointNearRect(x, y, panel.getBoundingClientRect(), 18, 18, 18);
  var overFab = !!fab && pointNearRect(x, y, fab.getBoundingClientRect(), 18, 18, 18);
  return overPanel || overFab;
}

function toggleControlsAutoHide(): void {
  controlsAutoHide = !controlsAutoHide;
  saveBooleanPreference(CONTROLS_AUTO_HIDE_STORE_KEY, controlsAutoHide);
  document.getElementById('controls-hide-btn')?.classList.toggle('active', controlsAutoHide);
  setControlsHidden(false);
  if (controlsAutoHide) {
    scheduleControlsHide(520);
    showToast('控制条自动隐藏已开启');
  } else {
    clearControlsHideTimer();
    showToast('控制条保持显示');
  }
}

function clearControlsHideTimer(): void {
  if (!controlsHideTimer) return;
  clearTimeout(controlsHideTimer);
  controlsHideTimer = null;
}

function applyControlsAutoHidePreference(): void {
  syncControlsAutoHideButton();
  setControlsHidden(false);
}

function syncControlsAutoHideButton(): void {
  document.getElementById('controls-hide-btn')?.classList.toggle('active', controlsAutoHide);
  if (!controlsAutoHide) clearControlsHideTimer();
}

function isCursorAutoHideMode(): boolean {
  return !document.hidden;
}

function clearCursorAutoHideTimer(): void {
  if (!cursorHideTimer) return;
  clearTimeout(cursorHideTimer);
  cursorHideTimer = null;
}

function setCursorHidden(hidden: boolean): void {
  document.body.classList.toggle('cursor-hidden', hidden && isCursorAutoHideMode());
}

function currentCursorHideDelay(): number {
  return immersiveMode ? IMMERSIVE_CURSOR_HIDE_DELAY : CURSOR_HIDE_DELAY;
}

function scheduleCursorHide(delay = currentCursorHideDelay()): void {
  clearCursorAutoHideTimer();
  if (!isCursorAutoHideMode()) {
    setCursorHidden(false);
    return;
  }
  cursorHideTimer = setTimeout(function(): void {
    cursorHideTimer = null;
    setCursorHidden(true);
  }, delay);
}

function revealCursorForActivity(): void {
  if (!isCursorAutoHideMode()) {
    clearCursorAutoHideTimer();
    setCursorHidden(false);
    return;
  }
  setCursorHidden(false);
  scheduleCursorHide();
}

function syncCursorAutoHideMode(): void {
  if (isCursorAutoHideMode()) revealCursorForActivity();
  else {
    clearCursorAutoHideTimer();
    setCursorHidden(false);
  }
}
