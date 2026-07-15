function readDiyModePreference(): boolean {
  try { return localStorage.getItem(DIY_MODE_STORE_KEY) === '1'; }
  catch (error) { return false; }
}

function saveDiyModePreference(enabled: boolean): void {
  try { localStorage.setItem(DIY_MODE_STORE_KEY, enabled ? '1' : '0'); }
  catch (error) {}
}

function applyUserCapsuleAutoHideState(): void {
  document.body.classList.toggle('user-capsule-auto-hide', userCapsuleAutoHide);
  var button = document.getElementById('user-capsule-hide-btn');
  if (!button) return;
  button.classList.toggle('on', userCapsuleAutoHide);
  button.textContent = userCapsuleAutoHide ? '›' : '‹';
  button.title = userCapsuleAutoHide ? '取消自动隐藏账号胶囊' : '自动隐藏账号胶囊';
}

function toggleUserCapsuleAutoHide(event?: Event): void {
  event?.stopPropagation();
  userCapsuleAutoHide = !userCapsuleAutoHide;
  saveBooleanPreference(USER_CAPSULE_AUTO_HIDE_STORE_KEY, userCapsuleAutoHide);
  applyUserCapsuleAutoHideState();
  showToast(userCapsuleAutoHide ? '账号胶囊已自动隐藏' : '账号胶囊已固定显示');
}

function updateUserCapsuleAutoHideFromPointer(x: number, y: number): void {
  if (!userCapsuleAutoHide || immersiveMode) {
    document.body.classList.remove('user-capsule-peek');
    return;
  }
  document.body.classList.toggle('user-capsule-peek', x > innerWidth - 112 && y < 126);
}

function applyFxFabAutoHideState(options: { forceHidden?: boolean } = {}): void {
  document.body.classList.toggle('fx-fab-auto-hide', fxFabAutoHide);
  if (!fxFabAutoHide) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
  } else if (options.forceHidden) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = false;
  }
  var button = document.getElementById('fx-fab-hide-btn');
  if (!button) return;
  button.classList.toggle('on', fxFabAutoHide);
  button.textContent = fxFabAutoHide ? '›' : '‹';
  button.title = fxFabAutoHide ? '取消自动隐藏视觉控制台' : '自动隐藏视觉控制台';
}

function toggleFxFabAutoHide(event?: Event): void {
  event?.stopPropagation();
  fxFabAutoHide = !fxFabAutoHide;
  saveBooleanPreference(FX_FAB_AUTO_HIDE_STORE_KEY, fxFabAutoHide);
  applyFxFabAutoHideState({ forceHidden: fxFabAutoHide });
  showToast(fxFabAutoHide ? '视觉控制台按钮已自动隐藏' : '视觉控制台按钮已固定显示');
}

function updateFxFabAutoHideFromPointer(x: number, y: number): void {
  if (!fxFabAutoHide || !diyPlayerMode || immersiveMode) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
    return;
  }
  var panel = document.getElementById('fx-panel');
  var panelOpen = !!panel && (panel.classList.contains('peek') || panel.classList.contains('show'));
  var nearCorner = x > innerWidth - 126 && y > innerHeight - 158;
  if (!nearCorner) fxFabAutoHideRevealArmed = true;
  document.body.classList.toggle('fx-fab-peek', panelOpen || isFxPanelClickHoldActive() || nearCorner && fxFabAutoHideRevealArmed);
}

function layoutFullscreenDiyZone(): FullscreenDiyRect {
  var width = innerWidth < 820 ? 104 : 128;
  var height = innerWidth < 720 ? 48 : 52;
  var left = innerWidth - 510;
  var top = 24;
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  if (anchor) {
    var anchorRect = anchor.getBoundingClientRect();
    if (anchorRect.width > 0 && anchorRect.height > 0) {
      left = anchorRect.left + anchorRect.width / 2 - width / 2;
      top = anchorRect.bottom + (innerWidth < 820 ? 8 : 12);
    }
  }
  left = Math.max(12, Math.min(innerWidth - width - 12, left));
  top = Math.max(8, Math.min(innerHeight - height - 8, top));
  document.documentElement.style.setProperty('--fullscreen-diy-left', left.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-top', top.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-width', width + 'px');
  return { left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
}

function shouldSuppressFullscreenDiyPeek(): boolean {
  var fxPanel = document.getElementById('fx-panel');
  var hotkeyModal = document.getElementById('hotkey-modal');
  return visualGuideActive || !!fxPanel && (fxPanel.classList.contains('peek') || fxPanel.classList.contains('show')) || !!hotkeyModal?.classList.contains('show');
}

function updateFullscreenDiyPeekFromPointer(x: number, y: number): void {
  var fullscreen = desktopRuntimeState.fullscreen || desktopFullscreenActive || !!document.fullscreenElement || document.body.classList.contains('desktop-fullscreen');
  if (!fullscreen || immersiveMode || shouldSuppressFullscreenDiyPeek()) {
    document.body.classList.remove('fullscreen-diy-peek');
    return;
  }
  var rect = layoutFullscreenDiyZone();
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  var anchorRect: ShelfCueRect | DOMRect = anchor ? anchor.getBoundingClientRect() : rect;
  var inDiyHotspot = x >= Math.min(rect.left, anchorRect.left) - 26
    && x <= Math.max(rect.right, anchorRect.right) + 26
    && y >= Math.min(rect.top, anchorRect.top) - 18
    && y <= Math.max(rect.bottom, anchorRect.bottom) + 16;
  var inMacHotspot = document.body.classList.contains('desktop-mac') && x <= 172 && y <= 76;
  document.body.classList.toggle('fullscreen-diy-peek', inDiyHotspot || inMacHotspot);
}

function isDiyMode(): boolean {
  return diyPlayerMode;
}

function syncDiyModeButton(): void {
  ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id): void {
    var button = document.getElementById(id);
    if (!button) return;
    button.classList.toggle('on', diyPlayerMode);
    button.setAttribute('aria-pressed', diyPlayerMode ? 'true' : 'false');
    button.title = diyPlayerMode ? '关闭 DIY 玩家模式' : '开启 DIY 玩家模式';
    button.setAttribute('aria-label', button.title);
  });
}

function applyDiyMode(enabled: boolean, options: DiyModeOptions = {}): void {
  diyPlayerMode = enabled;
  document.documentElement.classList.toggle('diy-mode-preload', enabled);
  document.documentElement.classList.toggle('simple-mode-preload', !enabled);
  document.body.classList.toggle('diy-mode', enabled);
  document.body.classList.toggle('simple-mode', !enabled);
  syncDiyModeButton();
  if (options.save) saveDiyModePreference(enabled);
  if (!enabled) closeDiyModePanels();
  if (options.toast) showToast(enabled ? 'DIY 玩家模式已开启' : '已切回简约模式');
  if (options.animate && window.gsap) animateDiyModeButtons();
}

function closeDiyModePanels(): void {
  toggleFxPanel(false);
  togglePlaylistPanel(false);
  closeUploadTip(false);
  document.getElementById('quality-control')?.classList.remove('open');
  document.getElementById('volume-control')?.classList.remove('open');
}

function animateDiyModeButtons(): void {
  ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id): void {
    var button = document.getElementById(id);
    if (button) window.gsap?.fromTo(button, { scale: 0.94 }, { scale: 1, duration: 0.34, ease: 'back.out(1.8)', overwrite: true });
  });
}

function toggleDiyMode(): void {
  applyDiyMode(!diyPlayerMode, { save: true, toast: true, animate: true });
  if (!visualGuideActive) return;
  visualGuideState.mode = diyPlayerMode ? 'diy' : 'simple';
  showVisualGuideStep(0);
}
